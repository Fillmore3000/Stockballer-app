// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ProSpectVaultV2
 * @dev Enhanced Hub and Spoke smart contract for StockBaller athlete tokenization
 * 
 * V2 Changes for Chainlink Convergence Hackathon:
 * - Added Chainlink CRE oracle authorization
 * - Oracle can update prices via updatePriceFromOracle()
 * - Owner retains emergency setPrice() capability
 * - Events enhanced for oracle tracking
 * 
 * Key Features:
 * - ERC-1155 tokens representing athlete shares
 * - Fixed supply of 1000 tokens per athlete
 * - USDC-based trading
 * - Chainlink CRE-controlled pricing (decentralized oracle)
 * - Emergency owner override for price updates
 * 
 * @custom:hackathon Chainlink Convergence
 * @custom:network Base Sepolia (chainId: 84532)
 */
contract ProSpectVaultV2 is ERC1155, Ownable, ReentrancyGuard {
    // USDC token contract
    IERC20 public immutable usdc;
    
    // Price constraints (in USDC - 6 decimals)
    uint256 public constant MIN_PRICE = 1 * 1e6;      // $1.00 minimum
    uint256 public constant MAX_PRICE = type(uint256).max; // No cap
    uint256 public constant TOKENS_PER_ATHLETE = 1000;
    
    // Trading fee (1% = 100 basis points)
    uint256 public tradingFeeBps = 100;
    uint256 public constant MAX_FEE_BPS = 500; // Max 5%
    
    // Token ID => Current Price (in USDC with 6 decimals)
    mapping(uint256 => uint256) public tokenPrices;
    
    // Token ID => Total Supply minted
    mapping(uint256 => uint256) public tokenSupply;
    
    // Token ID => Whether the athlete is active
    mapping(uint256 => bool) public athleteActive;
    
    // Accumulated trading fees
    uint256 public accumulatedFees;
    
    // ============================================
    // CHAINLINK CRE ORACLE INTEGRATION
    // ============================================
    
    // Authorized Chainlink oracle address (set by owner)
    address public chainlinkOracleAddress;
    
    // Track last oracle update timestamp per token
    mapping(uint256 => uint256) public lastOracleUpdate;
    
    // Oracle update counter for analytics
    uint256 public totalOracleUpdates;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event AthleteCreated(uint256 indexed tokenId, uint256 initialPrice);
    event PriceUpdated(uint256 indexed tokenId, uint256 oldPrice, uint256 newPrice);
    event TokensPurchased(address indexed buyer, uint256 indexed tokenId, uint256 amount, uint256 totalCost);
    event TokensSold(address indexed seller, uint256 indexed tokenId, uint256 amount, uint256 totalReceived);
    event FeesWithdrawn(address indexed to, uint256 amount);
    event TradingFeeUpdated(uint256 oldFee, uint256 newFee);
    
    // Chainlink-specific events
    event OracleAddressUpdated(address indexed oldOracle, address indexed newOracle);
    event OraclePriceUpdate(
        uint256 indexed tokenId, 
        uint256 oldPrice, 
        uint256 newPrice, 
        address indexed oracle,
        uint256 timestamp
    );
    
    // ============================================
    // MODIFIERS
    // ============================================
    
    /**
     * @dev Restricts function to authorized Chainlink oracle only
     */
    modifier onlyChainlinkOracle() {
        require(
            msg.sender == chainlinkOracleAddress,
            "ProSpectVaultV2: caller is not the oracle"
        );
        _;
    }
    
    /**
     * @dev Allows either owner or oracle to call
     */
    modifier onlyOwnerOrOracle() {
        require(
            msg.sender == owner() || msg.sender == chainlinkOracleAddress,
            "ProSpectVaultV2: caller is not owner or oracle"
        );
        _;
    }
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    /**
     * @dev Constructor
     * @param _usdc Address of the USDC token contract
     */
    constructor(address _usdc) ERC1155("https://stockballer.app/api/metadata/{id}.json") Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }
    
    // ============================================
    // CHAINLINK ORACLE FUNCTIONS
    // ============================================
    
    /**
     * @dev Set the authorized Chainlink oracle address
     * Only callable by contract owner
     * @param _oracle New oracle address
     */
    function setChainlinkOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle address");
        address oldOracle = chainlinkOracleAddress;
        chainlinkOracleAddress = _oracle;
        emit OracleAddressUpdated(oldOracle, _oracle);
    }
    
    /**
     * @dev Update athlete token price from Chainlink CRE workflow
     * 
     * This function is called by the Chainlink DON after achieving consensus
     * on the price calculation. The price is derived from:
     * - API-Football statistics (goals, assists, ratings)
     * - StockBaller pricing formula
     * - Verified by multiple Chainlink nodes
     * 
     * @param tokenId The athlete's token ID
     * @param newPrice New price in USDC (6 decimals)
     */
    function updatePriceFromOracle(
        uint256 tokenId, 
        uint256 newPrice
    ) external onlyChainlinkOracle {
        require(athleteActive[tokenId], "Athlete does not exist");
        require(newPrice >= MIN_PRICE && newPrice <= MAX_PRICE, "Price out of bounds");
        
        uint256 oldPrice = tokenPrices[tokenId];
        tokenPrices[tokenId] = newPrice;
        lastOracleUpdate[tokenId] = block.timestamp;
        totalOracleUpdates++;
        
        emit OraclePriceUpdate(tokenId, oldPrice, newPrice, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Batch update multiple athlete prices in one transaction
     * More gas efficient for updating many athletes
     * 
     * @param tokenIds Array of athlete token IDs
     * @param newPrices Array of new prices (must match tokenIds length)
     */
    function batchUpdatePricesFromOracle(
        uint256[] calldata tokenIds,
        uint256[] calldata newPrices
    ) external onlyChainlinkOracle {
        require(tokenIds.length == newPrices.length, "Array length mismatch");
        require(tokenIds.length <= 50, "Batch too large"); // Gas limit safety
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            uint256 newPrice = newPrices[i];
            
            if (!athleteActive[tokenId]) continue;
            if (newPrice < MIN_PRICE || newPrice > MAX_PRICE) continue;
            
            uint256 oldPrice = tokenPrices[tokenId];
            tokenPrices[tokenId] = newPrice;
            lastOracleUpdate[tokenId] = block.timestamp;
            totalOracleUpdates++;
            
            emit OraclePriceUpdate(tokenId, oldPrice, newPrice, msg.sender, block.timestamp);
        }
    }
    
    /**
     * @dev Get oracle status for a token
     * @param tokenId The athlete's token ID
     * @return lastUpdate Timestamp of last oracle update
     * @return currentPrice Current price
     * @return oracleActive Whether oracle is configured
     */
    function getOracleStatus(uint256 tokenId) external view returns (
        uint256 lastUpdate,
        uint256 currentPrice,
        bool oracleActive
    ) {
        return (
            lastOracleUpdate[tokenId],
            tokenPrices[tokenId],
            chainlinkOracleAddress != address(0)
        );
    }
    
    // ============================================
    // OWNER FUNCTIONS (EMERGENCY/ADMIN)
    // ============================================
    
    /**
     * @dev Create a new athlete token
     * @param tokenId Unique ID for the athlete
     * @param initialPrice Initial price in USDC (6 decimals)
     */
    function createAthlete(uint256 tokenId, uint256 initialPrice) external onlyOwner {
        require(!athleteActive[tokenId], "Athlete already exists");
        require(initialPrice >= MIN_PRICE && initialPrice <= MAX_PRICE, "Price out of bounds");
        
        athleteActive[tokenId] = true;
        tokenPrices[tokenId] = initialPrice;
        
        emit AthleteCreated(tokenId, initialPrice);
    }
    
    /**
     * @dev Emergency price update by owner
     * Use only if oracle malfunctions or for initial setup
     * 
     * @param tokenId The athlete's token ID
     * @param newPrice New price in USDC (6 decimals)
     */
    function setPrice(uint256 tokenId, uint256 newPrice) external onlyOwner {
        require(athleteActive[tokenId], "Athlete does not exist");
        require(newPrice >= MIN_PRICE && newPrice <= MAX_PRICE, "Price out of bounds");
        
        uint256 oldPrice = tokenPrices[tokenId];
        tokenPrices[tokenId] = newPrice;
        
        emit PriceUpdated(tokenId, oldPrice, newPrice);
    }
    
    /**
     * @dev Get the current price of a token
     * @param tokenId The athlete's token ID
     * @return The current price in USDC (6 decimals)
     */
    function getTokenPrice(uint256 tokenId) external view returns (uint256) {
        require(athleteActive[tokenId], "Athlete does not exist");
        return tokenPrices[tokenId];
    }
    
    // ============================================
    // TRADING FUNCTIONS
    // ============================================
    
    /**
     * @dev Buy athlete tokens with USDC
     * @param tokenId The athlete's token ID
     * @param amount Number of tokens to buy
     */
    function buyTokens(uint256 tokenId, uint256 amount) external nonReentrant {
        require(athleteActive[tokenId], "Athlete does not exist");
        require(amount > 0, "Amount must be > 0");
        require(tokenSupply[tokenId] + amount <= TOKENS_PER_ATHLETE, "Exceeds max supply");
        
        uint256 price = tokenPrices[tokenId];
        uint256 subtotal = price * amount;
        uint256 fee = (subtotal * tradingFeeBps) / 10000;
        uint256 totalCost = subtotal + fee;
        
        require(usdc.transferFrom(msg.sender, address(this), totalCost), "USDC transfer failed");
        
        accumulatedFees += fee;
        _mint(msg.sender, tokenId, amount, "");
        tokenSupply[tokenId] += amount;
        
        emit TokensPurchased(msg.sender, tokenId, amount, totalCost);
    }
    
    /**
     * @dev Sell athlete tokens for USDC
     * @param tokenId The athlete's token ID
     * @param amount Number of tokens to sell
     */
    function sellTokens(uint256 tokenId, uint256 amount) external nonReentrant {
        require(athleteActive[tokenId], "Athlete does not exist");
        require(amount > 0, "Amount must be > 0");
        require(balanceOf(msg.sender, tokenId) >= amount, "Insufficient balance");
        
        uint256 price = tokenPrices[tokenId];
        uint256 subtotal = price * amount;
        uint256 fee = (subtotal * tradingFeeBps) / 10000;
        uint256 totalReceived = subtotal - fee;
        
        _burn(msg.sender, tokenId, amount);
        tokenSupply[tokenId] -= amount;
        accumulatedFees += fee;
        
        require(usdc.transfer(msg.sender, totalReceived), "USDC transfer failed");
        
        emit TokensSold(msg.sender, tokenId, amount, totalReceived);
    }
    
    /**
     * @dev Get quote for buying tokens
     */
    function getBuyQuote(uint256 tokenId, uint256 amount) external view returns (
        uint256 subtotal,
        uint256 fee,
        uint256 total
    ) {
        require(athleteActive[tokenId], "Athlete does not exist");
        uint256 price = tokenPrices[tokenId];
        subtotal = price * amount;
        fee = (subtotal * tradingFeeBps) / 10000;
        total = subtotal + fee;
    }
    
    /**
     * @dev Get quote for selling tokens
     */
    function getSellQuote(uint256 tokenId, uint256 amount) external view returns (
        uint256 subtotal,
        uint256 fee,
        uint256 total
    ) {
        require(athleteActive[tokenId], "Athlete does not exist");
        uint256 price = tokenPrices[tokenId];
        subtotal = price * amount;
        fee = (subtotal * tradingFeeBps) / 10000;
        total = subtotal - fee;
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @dev Update the trading fee
     * @param newFeeBps New fee in basis points (100 = 1%)
     */
    function setTradingFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "Fee too high");
        uint256 oldFee = tradingFeeBps;
        tradingFeeBps = newFeeBps;
        emit TradingFeeUpdated(oldFee, newFeeBps);
    }
    
    /**
     * @dev Withdraw accumulated trading fees
     * @param to Address to send fees to
     */
    function withdrawFees(address to) external onlyOwner {
        require(to != address(0), "Invalid address");
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        require(usdc.transfer(to, amount), "Transfer failed");
        emit FeesWithdrawn(to, amount);
    }
    
    /**
     * @dev Get contract statistics for monitoring
     */
    function getContractStats() external view returns (
        uint256 _accumulatedFees,
        uint256 _totalOracleUpdates,
        address _oracleAddress,
        uint256 _tradingFeeBps
    ) {
        return (
            accumulatedFees,
            totalOracleUpdates,
            chainlinkOracleAddress,
            tradingFeeBps
        );
    }
}

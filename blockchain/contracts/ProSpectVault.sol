// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ProSpectVault
 * @dev Hub and Spoke smart contract for the ProSpect athlete tokenization platform
 * 
 * Key Features:
 * - ERC-1155 tokens representing athlete shares
 * - Fixed supply of 1000 tokens per athlete
 * - USDC-based trading
 * - Oracle-controlled pricing (backend updates prices)
 * - Price capped at $100 USD per token
 */
contract ProSpectVault is ERC1155, Ownable, ReentrancyGuard {
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
    
    // Events
    event AthleteCreated(uint256 indexed tokenId, uint256 initialPrice);
    event PriceUpdated(uint256 indexed tokenId, uint256 oldPrice, uint256 newPrice);
    event TokensPurchased(address indexed buyer, uint256 indexed tokenId, uint256 amount, uint256 totalCost);
    event TokensSold(address indexed seller, uint256 indexed tokenId, uint256 amount, uint256 totalReceived);
    event FeesWithdrawn(address indexed to, uint256 amount);
    event TradingFeeUpdated(uint256 oldFee, uint256 newFee);
    
    /**
     * @dev Constructor
     * @param _usdc Address of the USDC token contract
     */
    constructor(address _usdc) ERC1155("https://prospect.io/api/metadata/{id}.json") Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }
    
    /**
     * @dev Create a new athlete token
     * @param tokenId Unique ID for the athlete (should match DB ID)
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
     * @dev Update the price of an athlete token (Oracle function)
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
        
        // Transfer USDC from buyer
        require(usdc.transferFrom(msg.sender, address(this), totalCost), "USDC transfer failed");
        
        // Accumulate fees
        accumulatedFees += fee;
        
        // Mint tokens to buyer
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
        
        // Burn tokens from seller
        _burn(msg.sender, tokenId, amount);
        tokenSupply[tokenId] -= amount;
        
        // Accumulate fees
        accumulatedFees += fee;
        
        // Transfer USDC to seller
        require(usdc.transfer(msg.sender, totalReceived), "USDC transfer failed");
        
        emit TokensSold(msg.sender, tokenId, amount, totalReceived);
    }
    
    /**
     * @dev Get quote for buying tokens
     * @param tokenId The athlete's token ID
     * @param amount Number of tokens
     * @return subtotal The cost before fees
     * @return fee The trading fee
     * @return total The total cost including fees
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
     * @param tokenId The athlete's token ID
     * @param amount Number of tokens
     * @return subtotal The value before fees
     * @return fee The trading fee
     * @return total The total received after fees
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
    
    /**
     * @dev Update trading fee (owner only)
     * @param newFeeBps New fee in basis points (100 = 1%)
     */
    function setTradingFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "Fee too high");
        uint256 oldFee = tradingFeeBps;
        tradingFeeBps = newFeeBps;
        emit TradingFeeUpdated(oldFee, newFeeBps);
    }
    
    /**
     * @dev Withdraw accumulated fees (owner only)
     * @param to Address to send fees to
     */
    function withdrawFees(address to) external onlyOwner {
        require(to != address(0), "Invalid address");
        uint256 amount = accumulatedFees;
        require(amount > 0, "No fees to withdraw");
        
        accumulatedFees = 0;
        require(usdc.transfer(to, amount), "USDC transfer failed");
        
        emit FeesWithdrawn(to, amount);
    }
    
    /**
     * @dev Get athlete info
     * @param tokenId The athlete's token ID
     */
    function getAthleteInfo(uint256 tokenId) external view returns (
        bool active,
        uint256 price,
        uint256 supply,
        uint256 remaining
    ) {
        active = athleteActive[tokenId];
        price = tokenPrices[tokenId];
        supply = tokenSupply[tokenId];
        remaining = TOKENS_PER_ATHLETE - supply;
    }
    
    /**
     * @dev Emergency withdraw (owner only)
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
}

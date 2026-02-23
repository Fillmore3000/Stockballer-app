// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev A test stablecoin for development and testing on testnets
 * 
 * Features:
 * - 6 decimals (same as real USDC)
 * - Public mint function for testing (anyone can mint)
 * - Owner can mint unlimited amounts
 * - Faucet function to get test tokens
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private constant DECIMALS = 6;
    uint256 public constant FAUCET_AMOUNT = 10_000 * 10**DECIMALS; // $10,000 per faucet request
    uint256 public constant MINT_COOLDOWN = 1 hours;
    
    // Track last faucet request per address
    mapping(address => uint256) public lastFaucetRequest;
    
    event FaucetUsed(address indexed user, uint256 amount);
    event TokensMinted(address indexed to, uint256 amount);
    
    constructor() ERC20("Mock USDC", "mUSDC") Ownable(msg.sender) {
        // Mint initial supply to deployer for liquidity
        _mint(msg.sender, 1_000_000 * 10**DECIMALS); // 1M USDC
    }
    
    /**
     * @dev Returns 6 decimals like real USDC
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
    
    /**
     * @dev Faucet function - anyone can request test tokens
     * Limited to once per hour per address
     */
    function faucet() external {
        require(
            block.timestamp >= lastFaucetRequest[msg.sender] + MINT_COOLDOWN,
            "Faucet cooldown active"
        );
        
        lastFaucetRequest[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
        
        emit FaucetUsed(msg.sender, FAUCET_AMOUNT);
    }
    
    /**
     * @dev Mint tokens to any address (for testing)
     * Anyone can call this on testnet
     * @param to Recipient address
     * @param amount Amount to mint (in smallest units, 6 decimals)
     */
    function mint(address to, uint256 amount) external {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be > 0");
        require(amount <= 1_000_000 * 10**DECIMALS, "Max 1M per mint");
        
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    /**
     * @dev Owner can mint unlimited amounts (for initial liquidity)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function ownerMint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Cannot mint to zero address");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    /**
     * @dev Burn tokens from sender's balance
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    /**
     * @dev Check if an address can use the faucet
     * @param user Address to check
     * @return canUse Whether the faucet is available
     * @return cooldownRemaining Seconds until faucet is available (0 if available)
     */
    function canUseFaucet(address user) external view returns (bool canUse, uint256 cooldownRemaining) {
        uint256 lastRequest = lastFaucetRequest[user];
        uint256 nextAvailable = lastRequest + MINT_COOLDOWN;
        
        if (block.timestamp >= nextAvailable) {
            return (true, 0);
        } else {
            return (false, nextAvailable - block.timestamp);
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PredictionMarket
 * @dev AI-powered match prediction market for StockBaller
 * 
 * Users bet on whether the AI's predicted score will match the actual result.
 * If the AI prediction matches the final score, all bettors win a £100 bonus.
 * 
 * Flow:
 * 1. Chainlink CRE workflow submits AI prediction before match
 * 2. Users place bets backing the AI prediction
 * 3. After match, CRE workflow settles with actual result
 * 4. If AI was correct, winners split the bonus pool
 * 
 * Hackathon Categories:
 * - Prediction Markets: Betting on AI accuracy
 * - CRE & AI: LLM predictions via Chainlink Functions
 * 
 * @custom:hackathon Chainlink Convergence
 * @custom:network Base Sepolia (chainId: 84532)
 */
contract PredictionMarket is Ownable, ReentrancyGuard {
    // USDC token contract
    IERC20 public immutable usdc;
    
    // Bonus amount per match (£100 in USDC)
    uint256 public constant BONUS_AMOUNT = 100 * 1e6; // $100 USDC
    
    // Minimum bet amount
    uint256 public constant MIN_BET = 1 * 1e6; // $1 USDC
    
    // Maximum bet amount per user per match
    uint256 public constant MAX_BET = 1000 * 1e6; // $1000 USDC
    
    // Chainlink oracle address
    address public chainlinkOracleAddress;
    
    // Match prediction struct
    struct AIPrediction {
        string homeTeam;
        string awayTeam;
        uint8 predictedHomeScore;
        uint8 predictedAwayScore;
        uint8 confidence; // 1-100
        uint256 matchStartTime;
        uint256 predictionTimestamp;
        bool exists;
        bool settled;
        uint8 actualHomeScore;
        uint8 actualAwayScore;
        bool aiWasCorrect;
    }
    
    // User bet struct
    struct Bet {
        address user;
        uint256 amount;
        uint256 timestamp;
        bool claimed;
    }
    
    // Match ID => AI Prediction
    mapping(uint256 => AIPrediction) public predictions;
    
    // Match ID => User bets array
    mapping(uint256 => Bet[]) public matchBets;
    
    // Match ID => User address => bet index (1-indexed, 0 = no bet)
    mapping(uint256 => mapping(address => uint256)) public userBetIndex;
    
    // Match ID => Total pool size
    mapping(uint256 => uint256) public matchPool;
    
    // Match ID => Number of winners
    mapping(uint256 => uint256) public winnersCount;
    
    // User stats
    mapping(address => uint256) public userTotalBets;
    mapping(address => uint256) public userTotalWinnings;
    mapping(address => uint256) public userCorrectPredictions;
    
    // Platform stats
    uint256 public totalMatchesPredicted;
    uint256 public totalMatchesCorrect;
    uint256 public totalVolumeTraded;
    uint256 public totalBonusesPaid;
    
    // Bonus pool funded by platform
    uint256 public bonusPool;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event AIPredictionSubmitted(
        uint256 indexed matchId,
        string homeTeam,
        string awayTeam,
        uint8 predictedHomeScore,
        uint8 predictedAwayScore,
        uint8 confidence,
        uint256 matchStartTime
    );
    
    event BetPlaced(
        uint256 indexed matchId,
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    
    event MatchSettled(
        uint256 indexed matchId,
        uint8 actualHomeScore,
        uint8 actualAwayScore,
        bool aiWasCorrect,
        uint256 totalPool,
        uint256 winnersCount,
        uint256 bonusPerWinner
    );
    
    event WinningsClaimed(
        uint256 indexed matchId,
        address indexed user,
        uint256 betAmount,
        uint256 bonus,
        uint256 total
    );
    
    event BonusPoolFunded(address indexed funder, uint256 amount);
    event OracleAddressUpdated(address indexed oldOracle, address indexed newOracle);
    
    // ============================================
    // MODIFIERS
    // ============================================
    
    modifier onlyChainlinkOracle() {
        require(
            msg.sender == chainlinkOracleAddress,
            "PredictionMarket: caller is not the oracle"
        );
        _;
    }
    
    modifier onlyOwnerOrOracle() {
        require(
            msg.sender == owner() || msg.sender == chainlinkOracleAddress,
            "PredictionMarket: caller is not owner or oracle"
        );
        _;
    }
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }
    
    // ============================================
    // ORACLE FUNCTIONS
    // ============================================
    
    /**
     * @dev Set the Chainlink oracle address
     */
    function setChainlinkOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle address");
        address oldOracle = chainlinkOracleAddress;
        chainlinkOracleAddress = _oracle;
        emit OracleAddressUpdated(oldOracle, _oracle);
    }
    
    /**
     * @dev Submit AI prediction from Chainlink CRE workflow
     * Called before match kickoff
     */
    function submitAIPrediction(
        uint256 matchId,
        string calldata homeTeam,
        string calldata awayTeam,
        uint8 predictedHomeScore,
        uint8 predictedAwayScore,
        uint8 confidence,
        uint256 matchStartTime
    ) external onlyOwnerOrOracle {
        require(!predictions[matchId].exists, "Prediction already exists");
        require(matchStartTime > block.timestamp, "Match already started");
        require(confidence > 0 && confidence <= 100, "Invalid confidence");
        
        predictions[matchId] = AIPrediction({
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            predictedHomeScore: predictedHomeScore,
            predictedAwayScore: predictedAwayScore,
            confidence: confidence,
            matchStartTime: matchStartTime,
            predictionTimestamp: block.timestamp,
            exists: true,
            settled: false,
            actualHomeScore: 0,
            actualAwayScore: 0,
            aiWasCorrect: false
        });
        
        totalMatchesPredicted++;
        
        emit AIPredictionSubmitted(
            matchId,
            homeTeam,
            awayTeam,
            predictedHomeScore,
            predictedAwayScore,
            confidence,
            matchStartTime
        );
    }
    
    /**
     * @dev Settle match with actual result
     * Called after match ends by Chainlink CRE workflow
     */
    function settleMatch(
        uint256 matchId,
        uint8 actualHomeScore,
        uint8 actualAwayScore
    ) external onlyOwnerOrOracle nonReentrant {
        AIPrediction storage prediction = predictions[matchId];
        require(prediction.exists, "Prediction does not exist");
        require(!prediction.settled, "Match already settled");
        require(block.timestamp > prediction.matchStartTime, "Match not started");
        
        prediction.actualHomeScore = actualHomeScore;
        prediction.actualAwayScore = actualAwayScore;
        prediction.settled = true;
        
        // Check if AI was correct
        prediction.aiWasCorrect = (
            prediction.predictedHomeScore == actualHomeScore &&
            prediction.predictedAwayScore == actualAwayScore
        );
        
        if (prediction.aiWasCorrect) {
            totalMatchesCorrect++;
        }
        
        // Count winners (everyone who bet if AI was correct)
        uint256 winners = prediction.aiWasCorrect ? matchBets[matchId].length : 0;
        winnersCount[matchId] = winners;
        
        // Calculate bonus per winner
        uint256 bonusPerWinner = 0;
        if (winners > 0 && bonusPool >= BONUS_AMOUNT) {
            // Distribute bonus equally among all bettors
            bonusPerWinner = BONUS_AMOUNT / winners;
        }
        
        emit MatchSettled(
            matchId,
            actualHomeScore,
            actualAwayScore,
            prediction.aiWasCorrect,
            matchPool[matchId],
            winners,
            bonusPerWinner
        );
    }
    
    // ============================================
    // USER FUNCTIONS
    // ============================================
    
    /**
     * @dev Place a bet backing the AI prediction
     * Users are betting that the AI prediction will be correct
     */
    function placeBet(uint256 matchId, uint256 amount) external nonReentrant {
        AIPrediction storage prediction = predictions[matchId];
        require(prediction.exists, "No prediction for this match");
        require(!prediction.settled, "Match already settled");
        require(block.timestamp < prediction.matchStartTime, "Betting closed");
        require(amount >= MIN_BET, "Bet too small");
        require(amount <= MAX_BET, "Bet too large");
        require(userBetIndex[matchId][msg.sender] == 0, "Already bet on this match");
        
        // Transfer USDC from user
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // Record bet
        matchBets[matchId].push(Bet({
            user: msg.sender,
            amount: amount,
            timestamp: block.timestamp,
            claimed: false
        }));
        
        userBetIndex[matchId][msg.sender] = matchBets[matchId].length; // 1-indexed
        matchPool[matchId] += amount;
        userTotalBets[msg.sender]++;
        totalVolumeTraded += amount;
        
        emit BetPlaced(matchId, msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Claim winnings after match settlement
     * If AI was correct, user gets their bet back + share of bonus
     * If AI was wrong, user loses their bet
     */
    function claimWinnings(uint256 matchId) external nonReentrant {
        AIPrediction storage prediction = predictions[matchId];
        require(prediction.exists, "Prediction does not exist");
        require(prediction.settled, "Match not settled");
        
        uint256 betIndex = userBetIndex[matchId][msg.sender];
        require(betIndex > 0, "No bet found");
        
        Bet storage bet = matchBets[matchId][betIndex - 1];
        require(!bet.claimed, "Already claimed");
        require(bet.user == msg.sender, "Not your bet");
        
        bet.claimed = true;
        
        if (prediction.aiWasCorrect) {
            // User wins! Return bet + bonus
            uint256 winners = winnersCount[matchId];
            uint256 bonusShare = 0;
            
            if (winners > 0 && bonusPool >= BONUS_AMOUNT) {
                bonusShare = BONUS_AMOUNT / winners;
                bonusPool -= bonusShare;
                totalBonusesPaid += bonusShare;
            }
            
            uint256 totalPayout = bet.amount + bonusShare;
            
            require(usdc.transfer(msg.sender, totalPayout), "Transfer failed");
            
            userTotalWinnings[msg.sender] += totalPayout;
            userCorrectPredictions[msg.sender]++;
            
            emit WinningsClaimed(matchId, msg.sender, bet.amount, bonusShare, totalPayout);
        } else {
            // AI was wrong - user keeps their stake but no bonus
            // In a more aggressive version, user would lose stake
            // For hackathon demo, we return the stake (no risk betting)
            require(usdc.transfer(msg.sender, bet.amount), "Transfer failed");
            
            emit WinningsClaimed(matchId, msg.sender, bet.amount, 0, bet.amount);
        }
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @dev Get AI prediction for a match
     */
    function getAIPrediction(uint256 matchId) external view returns (
        uint8 homeScore,
        uint8 awayScore,
        uint8 confidence
    ) {
        AIPrediction storage prediction = predictions[matchId];
        require(prediction.exists, "Prediction does not exist");
        return (
            prediction.predictedHomeScore,
            prediction.predictedAwayScore,
            prediction.confidence
        );
    }
    
    /**
     * @dev Get full prediction details
     */
    function getPredictionDetails(uint256 matchId) external view returns (
        string memory homeTeam,
        string memory awayTeam,
        uint8 predictedHomeScore,
        uint8 predictedAwayScore,
        uint8 confidence,
        uint256 matchStartTime,
        bool settled,
        bool aiWasCorrect
    ) {
        AIPrediction storage prediction = predictions[matchId];
        require(prediction.exists, "Prediction does not exist");
        return (
            prediction.homeTeam,
            prediction.awayTeam,
            prediction.predictedHomeScore,
            prediction.predictedAwayScore,
            prediction.confidence,
            prediction.matchStartTime,
            prediction.settled,
            prediction.aiWasCorrect
        );
    }
    
    /**
     * @dev Get match betting stats
     */
    function getMatchStats(uint256 matchId) external view returns (
        uint256 totalPool,
        uint256 totalBets,
        uint256 winners
    ) {
        return (
            matchPool[matchId],
            matchBets[matchId].length,
            winnersCount[matchId]
        );
    }
    
    /**
     * @dev Get user stats
     */
    function getUserStats(address user) external view returns (
        uint256 totalBets,
        uint256 totalWinnings,
        uint256 correctPredictions
    ) {
        return (
            userTotalBets[user],
            userTotalWinnings[user],
            userCorrectPredictions[user]
        );
    }
    
    /**
     * @dev Get platform-wide stats
     */
    function getPlatformStats() external view returns (
        uint256 matchesPredicted,
        uint256 matchesCorrect,
        uint256 volume,
        uint256 bonusesPaid,
        uint256 currentBonusPool,
        uint256 aiAccuracy
    ) {
        uint256 accuracy = totalMatchesPredicted > 0 
            ? (totalMatchesCorrect * 100) / totalMatchesPredicted 
            : 0;
            
        return (
            totalMatchesPredicted,
            totalMatchesCorrect,
            totalVolumeTraded,
            totalBonusesPaid,
            bonusPool,
            accuracy
        );
    }
    
    /**
     * @dev Check if user has bet on a match
     */
    function hasBet(uint256 matchId, address user) external view returns (bool) {
        return userBetIndex[matchId][user] > 0;
    }
    
    /**
     * @dev Get user's bet for a match
     */
    function getUserBet(uint256 matchId, address user) external view returns (
        uint256 amount,
        uint256 timestamp,
        bool claimed
    ) {
        uint256 betIndex = userBetIndex[matchId][user];
        require(betIndex > 0, "No bet found");
        
        Bet storage bet = matchBets[matchId][betIndex - 1];
        return (bet.amount, bet.timestamp, bet.claimed);
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @dev Fund the bonus pool
     */
    function fundBonusPool(uint256 amount) external {
        require(amount > 0, "Amount must be positive");
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        bonusPool += amount;
        emit BonusPoolFunded(msg.sender, amount);
    }
    
    /**
     * @dev Emergency withdraw (owner only)
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(usdc.transfer(owner(), amount), "Transfer failed");
    }
}

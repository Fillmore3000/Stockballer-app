const { ethers } = require("hardhat");

/**
 * Deploy PredictionMarket contract to Base Sepolia
 * 
 * This contract handles AI match predictions and £100 bonus payouts
 * for users who correctly bet on AI predictions matching actual scores.
 * 
 * Hackathon: Chainlink Convergence - Prediction Markets track
 */
async function main() {
  console.log("Deploying PredictionMarket to Base Sepolia...\n");

  // Use same MockUSDC as ProSpectVault
  const USDC_ADDRESS = process.env.MOCK_USDC_ADDRESS || "0x3cAb626E44885d73B511584af3322C12c859B747";
  console.log("Using USDC address:", USDC_ADDRESS);

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy PredictionMarket
  const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy(USDC_ADDRESS);
  await predictionMarket.waitForDeployment();

  const contractAddress = await predictionMarket.getAddress();
  console.log("✅ PredictionMarket deployed to:", contractAddress);

  // Set deployer as oracle (for demo purposes)
  console.log("\n🔮 Setting deployer as Chainlink oracle (for demo)...");
  const setOracleTx = await predictionMarket.setChainlinkOracle(deployer.address);
  await setOracleTx.wait();
  console.log("✅ Oracle set to:", deployer.address);

  // Fund bonus pool with 1000 USDC
  console.log("\n💰 Funding bonus pool with 1000 USDC...");
  const MockUSDC = await ethers.getContractAt("IERC20", USDC_ADDRESS);
  
  // Approve PredictionMarket to spend USDC
  const fundAmount = ethers.parseUnits("1000", 6); // 1000 USDC
  const approveTx = await MockUSDC.approve(contractAddress, fundAmount);
  await approveTx.wait();
  
  // Fund the bonus pool
  const fundTx = await predictionMarket.fundBonusPool(fundAmount);
  await fundTx.wait();
  console.log("✅ Bonus pool funded with 1000 USDC");

  // Get current bonus pool
  const bonusPool = await predictionMarket.bonusPool();
  console.log("   Current bonus pool:", ethers.formatUnits(bonusPool, 6), "USDC");

  console.log("\n📋 Next Steps:");
  console.log("1. Update your api/.env file with:");
  console.log(`   PREDICTION_MARKET_ADDRESS="${contractAddress}"`);
  console.log("\n2. Update your blockchain/.env file with:");
  console.log(`   PREDICTION_MARKET_ADDRESS="${contractAddress}"`);
  console.log("\n3. Verify the contract:");
  console.log(`   npx hardhat verify --network baseSepolia ${contractAddress} "${USDC_ADDRESS}"`);

  console.log("\n🎉 Deployment complete!");
  console.log(`\n📊 Contract Summary:`);
  console.log(`   Address: ${contractAddress}`);
  console.log(`   USDC: ${USDC_ADDRESS}`);
  console.log(`   Oracle: ${deployer.address}`);
  console.log(`   Bonus Pool: ${ethers.formatUnits(bonusPool, 6)} USDC`);
  console.log(`   Min Bet: $1 USDC`);
  console.log(`   Max Bet: $1000 USDC`);
  console.log(`   Bonus per Win: $100 USDC`);

  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

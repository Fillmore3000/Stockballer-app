const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying MockUSDC to Base Sepolia...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy MockUSDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUsdc = await MockUSDC.deploy();
  await mockUsdc.waitForDeployment();

  const usdcAddress = await mockUsdc.getAddress();
  console.log("✅ MockUSDC deployed to:", usdcAddress);
  
  // Check deployer balance
  const deployerBalance = await mockUsdc.balanceOf(deployer.address);
  console.log("Deployer USDC balance:", ethers.formatUnits(deployerBalance, 6), "mUSDC");

  console.log("\n📋 Next Steps:");
  console.log("1. Update your .env file with:");
  console.log(`   MOCK_USDC_ADDRESS="${usdcAddress}"`);
  console.log("\n2. Verify the contract:");
  console.log(`   npx hardhat verify --network baseSepolia ${usdcAddress}`);
  console.log("\n3. Now deploy ProSpectVault with:");
  console.log(`   npx hardhat run scripts/deploy.js --network baseSepolia`);

  console.log("\n🎉 MockUSDC deployment complete!");
  
  return usdcAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

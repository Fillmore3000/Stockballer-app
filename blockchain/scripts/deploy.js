const { ethers } = require("hardhat");

// All 25 target players from targetPlayers.json
// Using apiFootballId as the on-chain tokenId and IPO price of $100
const TARGET_PLAYERS = [
  { id: 1100, name: "Erling Haaland", team: "Manchester City", position: "FW" },
  { id: 306, name: "Mohamed Salah", team: "Liverpool", position: "FW" },
  { id: 186, name: "Son Heung-min", team: "Tottenham", position: "FW" },
  { id: 1485, name: "Bruno Fernandes", team: "Manchester United", position: "MF" },
  { id: 184, name: "Harry Kane", team: "Bayern Munich", position: "FW" },
  { id: 631, name: "Kevin De Bruyne", team: "Manchester City", position: "MF" },
  { id: 1138, name: "Virgil van Dijk", team: "Liverpool", position: "DF" },
  { id: 909, name: "Marcus Rashford", team: "Manchester United", position: "FW" },
  { id: 2932, name: "Alisson Becker", team: "Liverpool", position: "GK" },
  { id: 2879, name: "Ederson", team: "Manchester City", position: "GK" },
  { id: 629, name: "Bernardo Silva", team: "Manchester City", position: "MF" },
  { id: 284, name: "Trent Alexander-Arnold", team: "Liverpool", position: "DF" },
  { id: 2935, name: "Andrew Robertson", team: "Liverpool", position: "DF" },
  { id: 617, name: "Ruben Dias", team: "Manchester City", position: "DF" },
  { id: 627, name: "Kyle Walker", team: "Manchester City", position: "DF" },
  { id: 280, name: "Diogo Jota", team: "Liverpool", position: "FW" },
  { id: 632, name: "Ilkay Gundogan", team: "Manchester City", position: "MF" },
  { id: 19370, name: "Phil Foden", team: "Manchester City", position: "MF" },
  { id: 19211, name: "Bukayo Saka", team: "Arsenal", position: "FW" },
  { id: 47380, name: "Gabriel Jesus", team: "Arsenal", position: "FW" },
  { id: 1460, name: "Declan Rice", team: "Arsenal", position: "MF" },
  { id: 18933, name: "James Maddison", team: "Tottenham", position: "MF" },
  { id: 152865, name: "Alexander Isak", team: "Newcastle", position: "FW" },
  { id: 162082, name: "Jude Bellingham", team: "Real Madrid", position: "MF" },
  { id: 874, name: "Casemiro", team: "Manchester United", position: "MF" },
];

// IPO price for all athletes: $100.00
const IPO_PRICE = "100.00";

async function main() {
  console.log("Deploying ProSpectVault to Base Sepolia...\n");

  // Use MockUSDC address from environment, or fallback to real USDC
  // Set MOCK_USDC_ADDRESS in .env after running deploy-mock-usdc.js
  const USDC_ADDRESS = process.env.MOCK_USDC_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  console.log("Using USDC address:", USDC_ADDRESS);

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy ProSpectVault
  const ProSpectVault = await ethers.getContractFactory("ProSpectVault");
  const vault = await ProSpectVault.deploy(USDC_ADDRESS);
  await vault.waitForDeployment();

  const vaultAddress = await vault.getAddress();
  console.log("✅ ProSpectVault deployed to:", vaultAddress);
  console.log("\n📋 Next Steps:");
  console.log("1. Update your .env file with:");
  console.log(`   VAULT_CONTRACT_ADDRESS="${vaultAddress}"`);
  console.log("\n2. Verify the contract:");
  console.log(`   npx hardhat verify --network baseSepolia ${vaultAddress} "${USDC_ADDRESS}"`);

  // Create all 25 athletes
  console.log(`\n🏃 Creating ${TARGET_PLAYERS.length} athletes at IPO price of $${IPO_PRICE}...\n`);

  const priceInUsdc = ethers.parseUnits(IPO_PRICE, 6);
  
  for (let i = 0; i < TARGET_PLAYERS.length; i++) {
    const player = TARGET_PLAYERS[i];
    try {
      const tx = await vault.createAthlete(player.id, priceInUsdc);
      await tx.wait();
      console.log(`   ✓ [${i + 1}/${TARGET_PLAYERS.length}] ${player.name} (ID: ${player.id}) - ${player.team} - ${player.position}`);
    } catch (error) {
      console.log(`   ✗ [${i + 1}/${TARGET_PLAYERS.length}] Failed to create ${player.name}: ${error.message}`);
    }
  }

  console.log("\n🎉 Deployment complete!");
  console.log(`\n📊 Summary:`);
  console.log(`   - Vault Address: ${vaultAddress}`);
  console.log(`   - USDC Address: ${USDC_ADDRESS}`);
  console.log(`   - Athletes Created: ${TARGET_PLAYERS.length}`);
  console.log(`   - IPO Price: $${IPO_PRICE}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

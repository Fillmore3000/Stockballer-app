/**
 * Register Athletes on Smart Contract
 * 
 * This script creates all athletes from the database on the ProSpectVault contract.
 * Must be run by the contract owner.
 * 
 * Updated: 2025/26 Season - 25 verified players with live API-Football data
 */
const { ethers } = require("hardhat");

// All athletes from the database with their tokenIds and prices (2025/26 Season)
const ATHLETES = [
  { tokenId: 1, name: "Mohamed Salah", price: 115.34 },
  { tokenId: 2, name: "E. Haaland", price: 183.74 },
  { tokenId: 3, name: "B. Saka", price: 126.18 },
  { tokenId: 4, name: "P. Foden", price: 126.58 },
  { tokenId: 5, name: "Bruno Fernandes", price: 119.41 },
  { tokenId: 6, name: "V. van Dijk", price: 127.49 },
  { tokenId: 7, name: "D. Rice", price: 123.50 },
  { tokenId: 8, name: "C. Palmer", price: 119.85 },
  { tokenId: 9, name: "M. Odegaard", price: 113.59 },
  { tokenId: 10, name: "Rodri", price: 94.35 },
  { tokenId: 11, name: "Ruben Dias", price: 125.69 },
  { tokenId: 12, name: "Bernardo Silva", price: 101.77 },
  { tokenId: 13, name: "K. Havertz", price: 79.98 },
  { tokenId: 14, name: "C. Gakpo", price: 126.06 },
  { tokenId: 15, name: "A. Gordon", price: 92.46 },
  { tokenId: 16, name: "F. Wirtz", price: 121.16 },
  { tokenId: 17, name: "Kylian Mbappe", price: 180.38 },
  { tokenId: 18, name: "Vinicius Junior", price: 124.80 },
  { tokenId: 19, name: "J. Bellingham", price: 118.77 },
  { tokenId: 20, name: "R. Lewandowski", price: 114.21 },
  { tokenId: 21, name: "Lamine Yamal", price: 159.29 },
  { tokenId: 22, name: "H. Kane", price: 169.58 },
  { tokenId: 23, name: "J. Musiala", price: 82.81 },
  { tokenId: 24, name: "Lautaro Martinez", price: 89.22 },
  { tokenId: 25, name: "M. Thuram", price: 84.65 },
];

// Contract address - use env or fallback to new deployment
const VAULT_ADDRESS = process.env.VAULT_CONTRACT_ADDRESS || "0x7b80458496894e0EfecD577Aaea647e0ef37DA0A";

async function main() {
  console.log("🚀 Registering athletes on ProSpectVault...\n");

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log(`📝 Using account: ${signer.address}`);
  
  // Check balance
  const balance = await ethers.provider.getBalance(signer.address);
  console.log(`💰 ETH Balance: ${ethers.formatEther(balance)} ETH\n`);

  // Get contract
  const vault = await ethers.getContractAt("ProSpectVault", VAULT_ADDRESS);
  
  // Check owner
  const owner = await vault.owner();
  console.log(`👑 Contract owner: ${owner}`);
  
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.error("❌ ERROR: Signer is not the contract owner!");
    console.error(`   Signer: ${signer.address}`);
    console.error(`   Owner:  ${owner}`);
    process.exit(1);
  }
  
  console.log("✅ Signer is the contract owner\n");

  // Register each athlete
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const athlete of ATHLETES) {
    try {
      // Check if athlete already exists
      const isActive = await vault.athleteActive(athlete.tokenId);
      
      if (isActive) {
        console.log(`⏭️  ${athlete.name} (ID: ${athlete.tokenId}) - Already registered, skipping`);
        skipCount++;
        continue;
      }

      // Convert price to USDC (6 decimals)
      const priceInUSDC = ethers.parseUnits(athlete.price.toFixed(2), 6);
      
      console.log(`📝 Registering ${athlete.name} (ID: ${athlete.tokenId}) at $${athlete.price.toFixed(2)}...`);
      
      const tx = await vault.createAthlete(athlete.tokenId, priceInUSDC);
      await tx.wait();
      
      console.log(`✅ ${athlete.name} registered! TxHash: ${tx.hash}`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ Failed to register ${athlete.name}: ${error.message}`);
      failCount++;
    }
  }

  console.log("\n========================================");
  console.log("📊 Registration Summary:");
  console.log(`   ✅ Registered: ${successCount}`);
  console.log(`   ⏭️  Skipped:    ${skipCount}`);
  console.log(`   ❌ Failed:     ${failCount}`);
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

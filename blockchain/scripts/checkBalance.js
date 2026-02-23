const hre = require("hardhat");
const { formatUnits, getAddress } = require("ethers");

async function main() {
  const vaultAddress = "0x86d44597b7D433501a4af42aA0BE17be9FEC2FaC";
  // Use checksummed address
  const userWallet = getAddress("0x88291d4f1e9e87f1ad51ed50d56a5a34bac33c36");
  
  const vault = await hre.ethers.getContractAt("ProSpectVault", vaultAddress);
  
  console.log(`\nChecking token balances for: ${userWallet}\n`);
  
  for (let tokenId = 1; tokenId <= 5; tokenId++) {
    try {
      const balance = await vault.balanceOf(userWallet, tokenId);
      console.log(`Token ${tokenId}: ${balance.toString()} tokens`);
    } catch (error) {
      console.log(`Token ${tokenId}: Error - ${error.message}`);
    }
  }
  
  // Also check USDC balance
  const usdcAddress = "0x3cAb626E44885d73B511584af3322C12c859B747";
  const usdc = await hre.ethers.getContractAt("MockUSDC", usdcAddress);
  const usdcBalance = await usdc.balanceOf(userWallet);
  console.log(`\nmUSDC Balance: $${formatUnits(usdcBalance, 6)}`);
}

main().catch(console.error);

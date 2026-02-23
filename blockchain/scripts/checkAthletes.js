/**
 * Quick script to check if athlete is active on-chain
 */
const { ethers } = require("hardhat");

const VAULT_ADDRESS = process.env.VAULT_CONTRACT_ADDRESS || "0x7b80458496894e0EfecD577Aaea647e0ef37DA0A";

async function main() {
  console.log(`Checking vault at: ${VAULT_ADDRESS}`);
  const vault = await ethers.getContractAt("ProSpectVault", VAULT_ADDRESS);
  
  // Check athletes 1-25
  for (let i = 1; i <= 25; i++) {
    const isActive = await vault.athleteActive(i);
    const price = isActive ? await vault.getTokenPrice(i) : 0n;
    console.log(`TokenId ${i}: active=${isActive}, price=$${ethers.formatUnits(price, 6)}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(console.error);

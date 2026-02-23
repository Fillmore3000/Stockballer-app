const hre = require('hardhat');
async function main() {
  const vaultAddress = '0x7b80458496894e0EfecD577Aaea647e0ef37DA0A';
  const walletAddress = '0x977Ad55cB75Ad56ED26b34585d397EAE50223B1B';
  const vault = await hre.ethers.getContractAt('ProSpectVault', vaultAddress);
  
  console.log('RAW ON-CHAIN TOKEN BALANCES (no division):');
  console.log('='.repeat(50));
  let total = 0;
  for (let tokenId = 1; tokenId <= 25; tokenId++) {
    const balance = await vault.balanceOf(walletAddress, tokenId);
    const rawQty = Number(balance); // NO DIVISION - raw value
    if (rawQty > 0) {
      console.log('TokenId ' + tokenId + ': ' + rawQty + ' tokens (raw)');
      total += rawQty;
    }
  }
  console.log('='.repeat(50));
  console.log('TOTAL RAW ON-CHAIN: ' + total + ' tokens');
}
main();

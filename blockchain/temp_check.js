const hre = require('hardhat');
async function main() {
  const vaultAddress = '0x7b80458496894e0EfecD577Aaea647e0ef37DA0A';
  const walletAddress = '0x977Ad55cB75Ad56ED26b34585d397EAE50223B1B';
  const vault = await hre.ethers.getContractAt('ProSpectVault', vaultAddress);
  
  console.log('ON-CHAIN HOLDINGS for', walletAddress);
  console.log('='.repeat(50));
  let total = 0;
  for (let tokenId = 1; tokenId <= 25; tokenId++) {
    const balance = await vault.balanceOf(walletAddress, tokenId);
    const qty = Number(balance) / 1e6;
    if (qty > 0) {
      console.log('TokenId ' + tokenId + ': ' + qty + ' tokens');
      total += qty;
    }
  }
  console.log('='.repeat(50));
  console.log('TOTAL ON-CHAIN: ' + total + ' tokens');
}
main();

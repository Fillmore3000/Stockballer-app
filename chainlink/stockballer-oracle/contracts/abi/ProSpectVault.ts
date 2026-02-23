// ProSpectVault ABI for Chainlink CRE Workflow
// Function: updatePriceFromOracle(uint256 tokenId, uint256 newPrice)

export const ProSpectVault = [
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'newPrice', type: 'uint256' },
    ],
    name: 'updatePriceFromOracle',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenIds', type: 'uint256[]' },
      { name: 'newPrices', type: 'uint256[]' },
    ],
    name: 'batchUpdatePricesFromOracle',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'prices',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'athletes',
    outputs: [
      { name: 'name', type: 'string' },
      { name: 'apiFootballId', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

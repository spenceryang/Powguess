const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://testnet-rpc.monad.xyz');
const SNOW_MARKET = '0xeF92D19dcee0ee22fDd6Ea62634d7FAEe8706d6c';
const USER_WALLET = '0xb103a5867d1bf1a4239410c10ec968a5a190231e';

const abi = [
  'function buyShares(uint256 marketId, bool isYes, uint256 shareAmount)'
];

async function main() {
  const contract = new ethers.Contract(SNOW_MARKET, abi, provider);

  console.log('Estimating gas for buyShares(1, true, 1)...');

  try {
    const gasEstimate = await contract.buyShares.estimateGas(1, true, 1, { from: USER_WALLET });
    console.log('Gas estimate:', gasEstimate.toString());

    // Also get current gas price
    const feeData = await provider.getFeeData();
    console.log('Gas price:', ethers.formatUnits(feeData.gasPrice || 0, 'gwei'), 'gwei');

    // Check user's MON balance for gas
    const balance = await provider.getBalance(USER_WALLET);
    console.log('MON balance:', ethers.formatEther(balance), 'MON');
  } catch (error) {
    console.log('Gas estimation failed!');
    console.log('Error:', error.message);
    if (error.data) console.log('Error data:', error.data);
    if (error.reason) console.log('Reason:', error.reason);
  }
}

main().catch(console.error);

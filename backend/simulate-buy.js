const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://testnet-rpc.monad.xyz');
const SNOW_MARKET = '0xeF92D19dcee0ee22fDd6Ea62634d7FAEe8706d6c';
const USER_WALLET = process.argv[2] || '0xb103a5867d1bf1a4239410c10ec968a5a190231e';

const abi = [
  'function buyShares(uint256 marketId, bool isYes, uint256 shareAmount)'
];

async function main() {
  const contract = new ethers.Contract(SNOW_MARKET, abi, provider);

  console.log('Simulating buyShares(1, true, 1) from wallet:', USER_WALLET);

  try {
    // Simulate the call
    const result = await contract.buyShares.staticCall(1, true, 1, { from: USER_WALLET });
    console.log('Simulation succeeded!', result);
  } catch (error) {
    console.log('Simulation failed!');
    console.log('Error:', error.message);
    if (error.data) {
      console.log('Error data:', error.data);
    }
    if (error.reason) {
      console.log('Reason:', error.reason);
    }
  }
}

main().catch(console.error);

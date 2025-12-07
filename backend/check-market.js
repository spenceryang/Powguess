const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://testnet-rpc.monad.xyz');
const SNOW_MARKET = '0xeF92D19dcee0ee22fDd6Ea62634d7FAEe8706d6c';

const abi = [
  'function getMarket(uint256 marketId) view returns (string resortName, string description, uint256 targetSnowfall, uint256 resolutionTime, uint8 status, uint8 outcome, uint256 totalYesShares, uint256 totalNoShares, uint256 totalPool)',
  'function marketCount() view returns (uint256)'
];

async function main() {
  const contract = new ethers.Contract(SNOW_MARKET, abi, provider);

  const count = await contract.marketCount();
  console.log('Total markets:', count.toString());

  const now = Math.floor(Date.now() / 1000);
  console.log('Current timestamp:', now);

  for (let i = 0; i < Math.min(Number(count), 5); i++) {
    const market = await contract.getMarket(i);
    console.log('\nMarket ' + i + ': ' + market.resortName);
    console.log('  Status: ' + market.status + ' (0=Active, 1=Resolved)');
    console.log('  Resolution: ' + market.resolutionTime.toString());
    console.log('  Expired: ' + (now >= Number(market.resolutionTime)));
  }
}

main().catch(console.error);

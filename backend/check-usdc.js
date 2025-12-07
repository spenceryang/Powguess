const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://testnet-rpc.monad.xyz');
const MOCK_USDC = '0xBDB5976d7a9712089c175e62790777EFFC885Eb6';
const SNOW_MARKET = '0xeF92D19dcee0ee22fDd6Ea62634d7FAEe8706d6c';

// Replace with your wallet address
const USER_WALLET = process.argv[2] || '0xb103a5867d1bf1a4239410c10ec968a5a190231e';

const abi = [
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

async function main() {
  const usdc = new ethers.Contract(MOCK_USDC, abi, provider);

  const balance = await usdc.balanceOf(USER_WALLET);
  const allowance = await usdc.allowance(USER_WALLET, SNOW_MARKET);

  console.log('Wallet:', USER_WALLET);
  console.log('USDC Balance:', ethers.formatUnits(balance, 6), 'USDC');
  console.log('Allowance to SnowMarket:', ethers.formatUnits(allowance, 6), 'USDC');
  console.log('Required for 1 share: 0.5 USDC');
}

main().catch(console.error);

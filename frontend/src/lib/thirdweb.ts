import { createThirdwebClient, defineChain } from "thirdweb";

// Monad Testnet chain configuration
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpc: "https://testnet-rpc.monad.xyz",
  blockExplorers: [
    {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  ],
  testnet: true,
});

// Create thirdweb client
export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "demo",
});

// Contract addresses
export const SNOW_MARKET_ADDRESS = process.env.NEXT_PUBLIC_SNOW_MARKET_ADDRESS || "";
export const MOCK_USDC_ADDRESS = process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS || "";

// Contract ABIs
export const SNOW_MARKET_ABI = [
  {
    inputs: [{ name: "marketId", type: "uint256" }, { name: "isYes", type: "bool" }, { name: "shareAmount", type: "uint256" }],
    name: "buyShares",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "marketId", type: "uint256" }],
    name: "claimWinnings",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "SHARE_PRICE",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const MOCK_USDC_ABI = [
  {
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "faucet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

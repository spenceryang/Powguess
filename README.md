# PowGuess - Snowfall Prediction Markets

A prediction market platform where users bet on snowfall at ski resorts using blockchain technology.

## Features

- **Prediction Markets**: Bet on whether ski resorts will receive target snowfall amounts
- **Fixed-Price Shares**: YES/NO shares always cost $0.50 USDC each
- **Weather Integration**: Real-time weather data from OpenWeather API
- **x402 Micropayments**: Pay-per-query for detailed market and weather data
- **Wallet Integration**: Connect via Thirdweb SDK + MetaMask

## Supported Resorts

- Mammoth Mountain
- Palisades Tahoe
- Jackson Hole
- Snowbird
- Aspen

## Project Structure

```
powguess/
├── contracts/           # Solidity smart contracts
│   ├── contracts/       # Source contracts
│   └── remix/           # Flattened contracts for Remix IDE
├── backend/             # Express + TypeScript API server
├── frontend/            # Next.js 14 + Thirdweb frontend
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- MetaMask wallet with Monad testnet ETH
- OpenWeather API key (optional, for real weather data)
- Thirdweb client ID (optional, for wallet connection)

### 1. Install Dependencies

```bash
cd contracts && npm install
cd ../backend && npm install
cd ../frontend && npm install --legacy-peer-deps
```

### 2. Add Monad Testnet to MetaMask

| Setting | Value |
|---------|-------|
| Network Name | Monad Testnet |
| RPC URL | `https://testnet-rpc.monad.xyz` |
| Chain ID | `10143` |
| Symbol | `MON` |
| Explorer | `https://testnet.monadexplorer.com` |

### 3. Deploy Contracts via Remix IDE

**No private key exposure required!**

#### Step 1: Open Remix IDE
Go to https://remix.ethereum.org

#### Step 2: Create Contract Files
Create two new files in Remix and paste the flattened contract code from:
- `contracts/remix/MockUSDC_flat.sol`
- `contracts/remix/SnowMarket_flat.sol`

#### Step 3: Compile
- Select Solidity compiler version `0.8.20`
- Compile both contracts

#### Step 4: Deploy MockUSDC
1. In "Deploy & Run" tab, select **"Injected Provider - MetaMask"**
2. MetaMask will prompt to connect - approve it
3. Select `MockUSDC` contract
4. Click **Deploy**
5. Confirm in MetaMask
6. **Copy the deployed MockUSDC address**

#### Step 5: Deploy SnowMarket
1. Select `SnowMarket` contract
2. In the constructor field, paste the MockUSDC address
3. Click **Deploy**
4. Confirm in MetaMask
5. **Copy the deployed SnowMarket address**

#### Step 6: Create Initial Markets
In Remix, with SnowMarket selected:

Call `createMarket` for each resort:

| Resort | Parameters |
|--------|------------|
| Mammoth | `"Mammoth Mountain", "Will Mammoth Mountain receive >= 12 inches?", 1200, <timestamp>` |
| Palisades | `"Palisades Tahoe", "Will Palisades Tahoe receive >= 8 inches?", 800, <timestamp>` |
| Jackson Hole | `"Jackson Hole", "Will Jackson Hole receive >= 15 inches?", 1500, <timestamp>` |
| Snowbird | `"Snowbird", "Will Snowbird receive >= 10 inches?", 1000, <timestamp>` |
| Aspen | `"Aspen", "Will Aspen receive >= 6 inches?", 600, <timestamp>` |

**Note**: `<timestamp>` should be a future Unix timestamp (e.g., 7 days from now).
Get it from: https://www.epochconverter.com/

### 4. Update Environment Files

After deploying, update the contract addresses:

**backend/.env:**
```bash
SNOW_MARKET_ADDRESS=0x...your_snowmarket_address
MOCK_USDC_ADDRESS=0x...your_mockusdc_address
```

**frontend/.env.local:**
```bash
NEXT_PUBLIC_SNOW_MARKET_ADDRESS=0x...your_snowmarket_address
NEXT_PUBLIC_MOCK_USDC_ADDRESS=0x...your_mockusdc_address
```

### 5. Start Backend

```bash
cd backend
npm run dev
```

Backend runs on http://localhost:3001

### 6. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on http://localhost:3000

## API Endpoints

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/api/health` | GET | Free | Health check |
| `/api/markets` | GET | Free | List all markets |
| `/api/markets/:id` | GET | $0.001 | Market details |
| `/api/weather/:resort` | GET | $0.01 | Weather data |
| `/api/markets/:id/settle` | POST | Admin | Settlement info |
| `/api/contracts` | GET | Free | Contract addresses |

## Smart Contracts

### SnowMarket.sol

Main prediction market contract:
- `createMarket()` - Create new prediction market (owner only)
- `buyShares()` - Buy YES or NO shares at $0.50 each
- `resolveMarket()` - Settle market with actual snowfall (owner only)
- `claimWinnings()` - Claim winnings after resolution
- `getOdds()` - Get current market odds

### MockUSDC.sol

Test USDC token:
- Standard ERC20 with 6 decimals
- `faucet()` - Get 1000 USDC for testing
- `mint()` - Owner can mint tokens

## Settling Markets

To settle a market with actual snowfall data:

1. Open Remix IDE with SnowMarket contract
2. Connect MetaMask (must be contract owner)
3. Call `resolveMarket(marketId, actualSnowfall)`
   - `actualSnowfall` is in inches × 100 (e.g., 12.5 inches = 1250)
4. Confirm transaction

## Environment Variables

### Backend
| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3001) |
| `SNOW_MARKET_ADDRESS` | Deployed SnowMarket address |
| `MOCK_USDC_ADDRESS` | Deployed MockUSDC address |
| `OPENWEATHER_API_KEY` | OpenWeather API key |
| `ADMIN_KEY` | Secret key for API auth |
| `SKIP_PAYMENTS` | Set to "true" for dev mode |

### Frontend
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` | Thirdweb client ID |
| `NEXT_PUBLIC_SNOW_MARKET_ADDRESS` | SnowMarket contract address |
| `NEXT_PUBLIC_MOCK_USDC_ADDRESS` | MockUSDC contract address |
| `NEXT_PUBLIC_API_URL` | Backend API URL |

## How It Works

1. **Create Market**: Owner creates markets with target snowfall amounts via Remix
2. **Buy Shares**: Users connect wallet and buy YES or NO shares at $0.50 each
3. **Wait**: Market remains open until resolution time
4. **Settle**: Owner settles with actual snowfall data via Remix
5. **Claim**: Winners claim proportional share of the total pool

## x402 Payments

The API uses x402 micropayments for premium endpoints:
- Market details: $0.001 per query
- Weather data: $0.01 per query

For development, `SKIP_PAYMENTS=true` is set by default.

## Getting Test USDC

1. Open Remix with MockUSDC contract
2. Connect your MetaMask
3. Call `faucet()` function
4. You'll receive 1000 test USDC

## Tech Stack

- **Smart Contracts**: Solidity 0.8.20, OpenZeppelin
- **Backend**: Express.js, TypeScript, ethers.js, x402
- **Frontend**: Next.js 14, React, Thirdweb SDK, TailwindCSS
- **Blockchain**: Monad Testnet
- **Weather**: OpenWeather API

## Owner Address

Contract owner: `0xb103a5867d1bf1a4239410c10ec968a5a190231e`

## License

MIT

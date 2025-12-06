# PowGuess - Snowfall Prediction Markets

<p align="center">
  <img src="frontend/public/powguess-logo.png" alt="PowGuess Logo" width="120" />
</p>

<p align="center">
  <strong>Predict the Powder. Win Big.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#license">License</a>
</p>

---

**Built for [Monad Blitz SF 2025](https://monad.xyz) Hackathon**

A prediction market platform where users bet on snowfall at ski resorts using blockchain technology on the Monad Testnet. Buy YES or NO shares at fixed prices and win when you predict the powder correctly!

## Features

- **Prediction Markets**: Bet on whether ski resorts will receive target snowfall amounts
- **Fixed-Price Shares**: YES/NO shares always cost $0.50 USDC each
- **Beer Mode**: Toggle to view all prices in ski lodge beers instead of USDC (for the true powder hounds)
- **Buy Beer with Winnings**: Convert your USDC winnings into lodge beer vouchers via x402 micropayments
- **Beer Leaderboard**: Track who has won the most beers across all users
- **Friends Circle**: Add wallet addresses with labels, see friends' predictions on each market
- **Toast Notifications**: Elegant slide-in notifications for all actions
- **Weather Forecasts**: Live snow forecasts with 24h/48h/7-day predictions
- **Resort Webcams**: Direct links to live webcams at each resort
- **Weather Integration**: Real-time weather data from OpenWeather API
- **x402 Micropayments**: Pay-per-query for detailed market and weather data + beer purchases
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
| `/api/leaderboard` | GET | Free | Beer leaderboard |
| `/api/circles/:address` | GET | Free | Get friends circle |
| `/api/circles/:address/friends` | POST | Free | Add friend to circle |
| `/api/circles/:address/positions/:marketId` | GET | Free | Friends positions |

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
- **Buy Beer**: $9.00 per lodge beer

For development, `SKIP_PAYMENTS=true` is set by default.

## x402 Beer Purchase

Winners can convert their USDC winnings into lodge beer vouchers using x402 micropayments!

### How It Works

1. **Win a Prediction**: Correctly predict snowfall and claim your USDC winnings
2. **Buy Beer**: Click "Buy a Lodge Beer with Winnings" button
3. **Get Voucher**: Receive a redemption code for beers at the resort
4. **Redeem at Lodge**: Show your code at the ski lodge bar

### API Endpoints

| Endpoint | Method | Price | Description |
|----------|--------|-------|-------------|
| `/api/buy-beer` | POST | $9/beer | Purchase beer voucher via x402 |
| `/api/beer-price` | GET | Free | Get beer pricing info |
| `/api/vouchers/:address` | GET | Free | Get user's vouchers |
| `/api/vouchers/:id/redeem` | POST | Free | Redeem a voucher |
| `/api/x402/info` | GET | Free | x402 payment protocol info |

### Example Beer Purchase

```bash
curl -X POST http://localhost:3001/api/buy-beer \
  -H "Content-Type: application/json" \
  -H "x-402-payment: demo-bypass" \
  -d '{"walletAddress": "0x...", "resort": "Mammoth Mountain", "beers": 2}'
```

Response:
```json
{
  "success": true,
  "voucher": {
    "id": "BEER-ABC123",
    "beers": 2,
    "resort": "Mammoth Mountain",
    "redemptionCode": "ZK38-8DU7-QZQK-BN3K",
    "totalPaid": "$18",
    "message": "Congratulations! You've purchased 2 lodge beers at Mammoth Mountain!"
  },
  "x402": {
    "protocol": "x402",
    "amountCharged": 18,
    "currency": "USD"
  }
}
```

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

## Deployed Contracts (Monad Testnet)

| Contract | Address |
|----------|---------|
| SnowMarket | `0xeF92D19dcee0ee22fDd6Ea62634d7FAEe8706d6c` |
| MockUSDC | `0xBDB5976d7a9712089c175e62790777EFFC885Eb6` |

**Contract Owner**: `0xb103a5867d1bf1a4239410c10ec968a5a190231e`

## Deployment

### Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub

2. **New Project** → **Deploy from GitHub repo** → Select `Powguess`

3. **Configure the service:**
   - Click on the service → **Settings** tab
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

4. **Add Environment Variables** (Variables tab):
   ```
   PORT=3001
   MONAD_RPC_URL=https://testnet-rpc.monad.xyz
   SNOW_MARKET_ADDRESS=0xeF92D19dcee0ee22fDd6Ea62634d7FAEe8706d6c
   MOCK_USDC_ADDRESS=0xBDB5976d7a9712089c175e62790777EFFC885Eb6
   PAYMENT_ADDRESS=0xb103a5867d1bf1a4239410c10ec968a5a190231e
   SKIP_PAYMENTS=true
   ```

5. **Deploy** - Railway provides a URL like `https://powguess-production.up.railway.app`

### Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub

2. **Add New Project** → **Import `Powguess`**

3. **Configure:**
   - **Root Directory**: `frontend`
   - **Framework Preset**: Next.js (auto-detected)

4. **Add Environment Variables:**
   ```
   NEXT_PUBLIC_THIRDWEB_CLIENT_ID=<your-thirdweb-client-id>
   NEXT_PUBLIC_API_URL=https://<your-railway-url>
   ```

5. **Deploy**

### Connect Custom Domain

#### In Vercel:
1. Project Settings → Domains → Add your domain

#### In your DNS provider (e.g., Namecheap):
| Type | Host | Value |
|------|------|-------|
| A | @ | 76.76.21.21 |
| CNAME | www | cname.vercel-dns.com |

#### Optional: API Subdomain
1. In Railway: Settings → Domains → Add `api.yourdomain.com`
2. In DNS: Add CNAME `api` → Railway's provided domain
3. Update Vercel env: `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Built for **Monad Blitz SF 2025** Hackathon
- Powered by [Monad](https://monad.xyz) - High-performance EVM blockchain
- Wallet integration by [Thirdweb](https://thirdweb.com)
- Weather data from [OpenWeather](https://openweathermap.org)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❄️ for powder lovers everywhere
</p>

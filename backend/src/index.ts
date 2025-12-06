import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Contract configuration
const SNOW_MARKET_ADDRESS = process.env.SNOW_MARKET_ADDRESS || '';
const MOCK_USDC_ADDRESS = process.env.MOCK_USDC_ADDRESS || '';
const RPC_URL = process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz';

// OpenWeather API
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '';

// Resort data including coordinates and webcam URLs
interface ResortInfo {
  lat: number;
  lon: number;
  elevation: number;
  webcams: { name: string; url: string; embedUrl?: string }[];
  website: string;
}

const RESORT_DATA: { [key: string]: ResortInfo } = {
  'Mammoth Mountain': {
    lat: 37.6308,
    lon: -119.0326,
    elevation: 11053,
    webcams: [
      { name: 'Main Lodge', url: 'https://www.mammothmountain.com/mountain-information/webcams', embedUrl: 'https://www.mammothmountain.com/webcams/main-lodge' },
      { name: 'Village Gondola', url: 'https://www.mammothmountain.com/mountain-information/webcams' },
      { name: 'McCoy Station', url: 'https://www.mammothmountain.com/mountain-information/webcams' },
    ],
    website: 'https://www.mammothmountain.com',
  },
  'Palisades Tahoe': {
    lat: 39.1969,
    lon: -120.2358,
    elevation: 8200,
    webcams: [
      { name: 'High Camp', url: 'https://www.palisadestahoe.com/mountain-information/webcams' },
      { name: 'Base Area', url: 'https://www.palisadestahoe.com/mountain-information/webcams' },
      { name: 'KT-22', url: 'https://www.palisadestahoe.com/mountain-information/webcams' },
    ],
    website: 'https://www.palisadestahoe.com',
  },
  'Jackson Hole': {
    lat: 43.5875,
    lon: -110.8279,
    elevation: 10450,
    webcams: [
      { name: 'Teton Village', url: 'https://www.jacksonhole.com/webcams' },
      { name: 'Corbet\'s Cabin', url: 'https://www.jacksonhole.com/webcams' },
      { name: 'Rendezvous Bowl', url: 'https://www.jacksonhole.com/webcams' },
    ],
    website: 'https://www.jacksonhole.com',
  },
  'Snowbird': {
    lat: 40.5830,
    lon: -111.6538,
    elevation: 11000,
    webcams: [
      { name: 'Hidden Peak', url: 'https://www.snowbird.com/mountain-report/#checks-cameras' },
      { name: 'Entry 1', url: 'https://www.snowbird.com/mountain-report/#checks-cameras' },
      { name: 'Mineral Basin', url: 'https://www.snowbird.com/mountain-report/#checks-cameras' },
    ],
    website: 'https://www.snowbird.com',
  },
  'Aspen': {
    lat: 39.1911,
    lon: -106.8175,
    elevation: 11212,
    webcams: [
      { name: 'Aspen Mountain', url: 'https://www.aspensnowmass.com/our-mountains/aspen-mountain/webcams' },
      { name: 'Snowmass Base', url: 'https://www.aspensnowmass.com/our-mountains/snowmass/webcams' },
      { name: 'Highland Bowl', url: 'https://www.aspensnowmass.com/our-mountains/aspen-highlands/webcams' },
    ],
    website: 'https://www.aspensnowmass.com',
  },
};

// Legacy coords accessor for backwards compatibility
const RESORT_COORDS: { [key: string]: { lat: number; lon: number } } = Object.fromEntries(
  Object.entries(RESORT_DATA).map(([name, data]) => [name, { lat: data.lat, lon: data.lon }])
);

// Contract ABI (minimal for reading)
const SNOW_MARKET_ABI = [
  'function marketCount() view returns (uint256)',
  'function markets(uint256) view returns (uint256 id, string resortName, string description, uint256 targetSnowfall, uint256 resolutionTime, uint8 status, uint8 outcome, uint256 totalYesShares, uint256 totalNoShares, uint256 totalPool)',
  'function getMarket(uint256 marketId) view returns (string resortName, string description, uint256 targetSnowfall, uint256 resolutionTime, uint8 status, uint8 outcome, uint256 totalYesShares, uint256 totalNoShares, uint256 totalPool)',
  'function getOdds(uint256 marketId) view returns (uint256 yesOdds, uint256 noOdds)',
  'function getActiveMarkets() view returns (uint256[])',
  'function getPosition(uint256 marketId, address user) view returns (uint256 yesShares, uint256 noShares)',
  'function resolveMarket(uint256 marketId, uint256 actualSnowfall)',
];

// x402 Payment tracking (simplified in-memory for demo)
interface PaymentRecord {
  address: string;
  amount: number;
  timestamp: number;
  endpoint: string;
}

const payments: PaymentRecord[] = [];

// Beer voucher system
interface BeerVoucher {
  id: string;
  walletAddress: string;
  beers: number;
  amountPaid: number;
  resort: string;
  createdAt: number;
  redeemed: boolean;
  redemptionCode: string;
}

const beerVouchers: BeerVoucher[] = [];
const BEER_PRICE_USD = 9; // $9 per lodge beer

// Dummy data for leaderboard demonstration
const dummyVouchers: BeerVoucher[] = [
  {
    id: 'BEER-DEMO01',
    walletAddress: '0x742d35cc6634c0532925a3b844bc454e4438f44e',
    beers: 12,
    amountPaid: 108,
    resort: 'Mammoth Mountain',
    createdAt: Date.now() - 86400000 * 5,
    redeemed: true,
    redemptionCode: 'DEMO-1234-5678-ABCD',
  },
  {
    id: 'BEER-DEMO02',
    walletAddress: '0x742d35cc6634c0532925a3b844bc454e4438f44e',
    beers: 6,
    amountPaid: 54,
    resort: 'Jackson Hole',
    createdAt: Date.now() - 86400000 * 3,
    redeemed: false,
    redemptionCode: 'DEMO-2345-6789-BCDE',
  },
  {
    id: 'BEER-DEMO03',
    walletAddress: '0x8ba1f109551bd432803012645ac136ddd64dba72',
    beers: 8,
    amountPaid: 72,
    resort: 'Palisades Tahoe',
    createdAt: Date.now() - 86400000 * 4,
    redeemed: true,
    redemptionCode: 'DEMO-3456-7890-CDEF',
  },
  {
    id: 'BEER-DEMO04',
    walletAddress: '0x8ba1f109551bd432803012645ac136ddd64dba72',
    beers: 4,
    amountPaid: 36,
    resort: 'Snowbird',
    createdAt: Date.now() - 86400000 * 2,
    redeemed: true,
    redemptionCode: 'DEMO-4567-8901-DEFG',
  },
  {
    id: 'BEER-DEMO05',
    walletAddress: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
    beers: 10,
    amountPaid: 90,
    resort: 'Aspen',
    createdAt: Date.now() - 86400000 * 6,
    redeemed: true,
    redemptionCode: 'DEMO-5678-9012-EFGH',
  },
  {
    id: 'BEER-DEMO06',
    walletAddress: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
    beers: 3,
    amountPaid: 27,
    resort: 'Mammoth Mountain',
    createdAt: Date.now() - 86400000 * 1,
    redeemed: false,
    redemptionCode: 'DEMO-6789-0123-FGHI',
  },
  {
    id: 'BEER-DEMO07',
    walletAddress: '0xfabb0ac9d68b0b445fb7357272ff202c5651694a',
    beers: 5,
    amountPaid: 45,
    resort: 'Jackson Hole',
    createdAt: Date.now() - 86400000 * 7,
    redeemed: true,
    redemptionCode: 'DEMO-7890-1234-GHIJ',
  },
  {
    id: 'BEER-DEMO08',
    walletAddress: '0x1cbd3b2770909d4e10f157cabc84c7264073c9ec',
    beers: 7,
    amountPaid: 63,
    resort: 'Palisades Tahoe',
    createdAt: Date.now() - 86400000 * 8,
    redeemed: false,
    redemptionCode: 'DEMO-8901-2345-HIJK',
  },
  {
    id: 'BEER-DEMO09',
    walletAddress: '0xb103a5867d1bf1a4239410c10ec968a5a190231e',
    beers: 15,
    amountPaid: 135,
    resort: 'Mammoth Mountain',
    createdAt: Date.now() - 86400000 * 2,
    redeemed: true,
    redemptionCode: 'DEMO-9012-3456-IJKL',
  },
  {
    id: 'BEER-DEMO10',
    walletAddress: '0xb103a5867d1bf1a4239410c10ec968a5a190231e',
    beers: 4,
    amountPaid: 36,
    resort: 'Snowbird',
    createdAt: Date.now() - 86400000 * 1,
    redeemed: false,
    redemptionCode: 'DEMO-0123-4567-JKLM',
  },
];

// Initialize with dummy data
beerVouchers.push(...dummyVouchers);

// Leaderboard user nicknames (for display)
const userNicknames: { [address: string]: string } = {
  '0x742d35cc6634c0532925a3b844bc454e4438f44e': 'PowderHound',
  '0x8ba1f109551bd432803012645ac136ddd64dba72': 'SkiBum42',
  '0x71c7656ec7ab88b098defb751b7401b5f6d8976f': 'DeepSnowDave',
  '0xfabb0ac9d68b0b445fb7357272ff202c5651694a': 'MogulMaster',
  '0x1cbd3b2770909d4e10f157cabc84c7264073c9ec': 'FreshTracks',
  '0xb103a5867d1bf1a4239410c10ec968a5a190231e': 'ApresSkiKing',
};

// Friends Circle System
interface Friend {
  address: string;
  label: string;
  addedAt: number;
}

interface UserCircle {
  ownerAddress: string;
  friends: Friend[];
  createdAt: number;
  updatedAt: number;
}

const userCircles: { [ownerAddress: string]: UserCircle } = {};

// Demo circles with dummy data
userCircles['0xb103a5867d1bf1a4239410c10ec968a5a190231e'] = {
  ownerAddress: '0xb103a5867d1bf1a4239410c10ec968a5a190231e',
  friends: [
    { address: '0x742d35cc6634c0532925a3b844bc454e4438f44e', label: 'Jake (Tahoe Crew)', addedAt: Date.now() - 86400000 * 10 },
    { address: '0x8ba1f109551bd432803012645ac136ddd64dba72', label: 'Mike (College Buddy)', addedAt: Date.now() - 86400000 * 8 },
    { address: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f', label: 'Sarah (Work Friend)', addedAt: Date.now() - 86400000 * 5 },
  ],
  createdAt: Date.now() - 86400000 * 10,
  updatedAt: Date.now() - 86400000 * 1,
};

// Simulated positions for demo (in production, this would query the blockchain)
interface SimulatedPosition {
  marketId: number;
  address: string;
  yesShares: number;
  noShares: number;
}

const simulatedPositions: SimulatedPosition[] = [
  // Market 0 - Mammoth
  { marketId: 0, address: '0x742d35cc6634c0532925a3b844bc454e4438f44e', yesShares: 10, noShares: 0 },
  { marketId: 0, address: '0x8ba1f109551bd432803012645ac136ddd64dba72', yesShares: 0, noShares: 5 },
  { marketId: 0, address: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f', yesShares: 8, noShares: 2 },
  { marketId: 0, address: '0xb103a5867d1bf1a4239410c10ec968a5a190231e', yesShares: 15, noShares: 0 },
  // Market 1 - Palisades
  { marketId: 1, address: '0x742d35cc6634c0532925a3b844bc454e4438f44e', yesShares: 5, noShares: 5 },
  { marketId: 1, address: '0x8ba1f109551bd432803012645ac136ddd64dba72', yesShares: 12, noShares: 0 },
  { marketId: 1, address: '0xb103a5867d1bf1a4239410c10ec968a5a190231e', yesShares: 0, noShares: 8 },
  // Market 2 - Jackson Hole
  { marketId: 2, address: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f', yesShares: 20, noShares: 0 },
  { marketId: 2, address: '0xfabb0ac9d68b0b445fb7357272ff202c5651694a', yesShares: 6, noShares: 0 },
  { marketId: 2, address: '0xb103a5867d1bf1a4239410c10ec968a5a190231e', yesShares: 10, noShares: 5 },
  // Market 3 - Snowbird
  { marketId: 3, address: '0x742d35cc6634c0532925a3b844bc454e4438f44e', yesShares: 0, noShares: 15 },
  { marketId: 3, address: '0x8ba1f109551bd432803012645ac136ddd64dba72', yesShares: 7, noShares: 0 },
  // Market 4 - Aspen
  { marketId: 4, address: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f', yesShares: 0, noShares: 10 },
  { marketId: 4, address: '0xb103a5867d1bf1a4239410c10ec968a5a190231e', yesShares: 5, noShares: 5 },
];

// Generate unique voucher ID
const generateVoucherId = (): string => {
  return 'BEER-' + Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Generate redemption code (looks like a gift card code)
const generateRedemptionCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// x402 Payment middleware (simplified)
const x402Middleware = (priceUsd: number) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const paymentHeader = req.headers['x-402-payment'];

    // For demo: allow bypass with special header or check for valid payment
    if (paymentHeader === 'demo-bypass' || process.env.SKIP_PAYMENTS === 'true') {
      next();
      return;
    }

    // Check for x402 payment proof
    if (!paymentHeader) {
      res.status(402).json({
        error: 'Payment Required',
        price: priceUsd,
        currency: 'USD',
        message: `This endpoint requires a payment of $${priceUsd}`,
        paymentAddress: process.env.PAYMENT_ADDRESS || '0x...',
        paymentNetwork: 'base-sepolia',
      });
      return;
    }

    // In production, verify the payment proof here
    // For demo, accept any payment header
    payments.push({
      address: req.headers['x-402-payer'] as string || 'unknown',
      amount: priceUsd,
      timestamp: Date.now(),
      endpoint: req.path,
    });

    next();
  };
};

// Provider setup
let provider: ethers.JsonRpcProvider | null = null;
let snowMarket: ethers.Contract | null = null;

const setupProvider = () => {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    if (SNOW_MARKET_ADDRESS) {
      snowMarket = new ethers.Contract(SNOW_MARKET_ADDRESS, SNOW_MARKET_ABI, provider);
    }
  }
};

// Helper to format market data
interface Market {
  id: number;
  resortName: string;
  description: string;
  targetSnowfall: number;
  resolutionTime: number;
  status: string;
  outcome: string;
  totalYesShares: string;
  totalNoShares: string;
  totalPool: string;
  yesOdds: number;
  noOdds: number;
}

const formatMarket = async (marketId: number): Promise<Market | null> => {
  if (!snowMarket) return null;

  try {
    const [market, odds] = await Promise.all([
      snowMarket.getMarket(marketId),
      snowMarket.getOdds(marketId),
    ]);

    const statusMap = ['Active', 'Resolved'];
    const outcomeMap = ['Undecided', 'Yes', 'No'];

    return {
      id: marketId,
      resortName: market.resortName,
      description: market.description,
      targetSnowfall: Number(market.targetSnowfall) / 100, // Convert from scaled
      resolutionTime: Number(market.resolutionTime),
      status: statusMap[market.status] || 'Unknown',
      outcome: outcomeMap[market.outcome] || 'Unknown',
      totalYesShares: ethers.formatUnits(market.totalYesShares, 0),
      totalNoShares: ethers.formatUnits(market.totalNoShares, 0),
      totalPool: ethers.formatUnits(market.totalPool, 6), // USDC has 6 decimals
      yesOdds: Number(odds.yesOdds),
      noOdds: Number(odds.noOdds),
    };
  } catch (error) {
    console.error(`Error fetching market ${marketId}:`, error);
    return null;
  }
};

// Routes

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all markets (free)
app.get('/api/markets', async (req: Request, res: Response) => {
  setupProvider();

  // If no contract deployed, return mock data
  if (!snowMarket) {
    const mockMarkets: Market[] = [
      { id: 0, resortName: 'Mammoth Mountain', description: 'Will Mammoth Mountain receive >= 12 inches of snow in the next 7 days?', targetSnowfall: 12, resolutionTime: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, status: 'Active', outcome: 'Undecided', totalYesShares: '0', totalNoShares: '0', totalPool: '0', yesOdds: 50, noOdds: 50 },
      { id: 1, resortName: 'Palisades Tahoe', description: 'Will Palisades Tahoe receive >= 8 inches of snow in the next 7 days?', targetSnowfall: 8, resolutionTime: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, status: 'Active', outcome: 'Undecided', totalYesShares: '0', totalNoShares: '0', totalPool: '0', yesOdds: 50, noOdds: 50 },
      { id: 2, resortName: 'Jackson Hole', description: 'Will Jackson Hole receive >= 15 inches of snow in the next 7 days?', targetSnowfall: 15, resolutionTime: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, status: 'Active', outcome: 'Undecided', totalYesShares: '0', totalNoShares: '0', totalPool: '0', yesOdds: 50, noOdds: 50 },
      { id: 3, resortName: 'Snowbird', description: 'Will Snowbird receive >= 10 inches of snow in the next 7 days?', targetSnowfall: 10, resolutionTime: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, status: 'Active', outcome: 'Undecided', totalYesShares: '0', totalNoShares: '0', totalPool: '0', yesOdds: 50, noOdds: 50 },
      { id: 4, resortName: 'Aspen', description: 'Will Aspen receive >= 6 inches of snow in the next 7 days?', targetSnowfall: 6, resolutionTime: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, status: 'Active', outcome: 'Undecided', totalYesShares: '0', totalNoShares: '0', totalPool: '0', yesOdds: 50, noOdds: 50 },
    ];
    res.json({ markets: mockMarkets });
    return;
  }

  try {
    const marketCount = await snowMarket.marketCount();
    const markets: Market[] = [];

    for (let i = 0; i < Number(marketCount); i++) {
      const market = await formatMarket(i);
      if (market) markets.push(market);
    }

    res.json({ markets });
  } catch (error) {
    console.error('Error fetching markets:', error);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

// Get single market details (paid - $0.001)
app.get('/api/markets/:id', x402Middleware(0.001), async (req: Request, res: Response) => {
  setupProvider();
  const marketId = parseInt(req.params.id);

  if (isNaN(marketId)) {
    res.status(400).json({ error: 'Invalid market ID' });
    return;
  }

  // If no contract deployed, return mock data
  if (!snowMarket) {
    const mockResorts = ['Mammoth Mountain', 'Palisades Tahoe', 'Jackson Hole', 'Snowbird', 'Aspen'];
    const targets = [12, 8, 15, 10, 6];

    if (marketId >= mockResorts.length) {
      res.status(404).json({ error: 'Market not found' });
      return;
    }

    res.json({
      market: {
        id: marketId,
        resortName: mockResorts[marketId],
        description: `Will ${mockResorts[marketId]} receive >= ${targets[marketId]} inches of snow in the next 7 days?`,
        targetSnowfall: targets[marketId],
        resolutionTime: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        status: 'Active',
        outcome: 'Undecided',
        totalYesShares: '0',
        totalNoShares: '0',
        totalPool: '0',
        yesOdds: 50,
        noOdds: 50,
      },
    });
    return;
  }

  try {
    const market = await formatMarket(marketId);
    if (!market) {
      res.status(404).json({ error: 'Market not found' });
      return;
    }
    res.json({ market });
  } catch (error) {
    console.error('Error fetching market:', error);
    res.status(500).json({ error: 'Failed to fetch market' });
  }
});

// Get weather data for a resort (paid - $0.01)
app.get('/api/weather/:resort', x402Middleware(0.01), async (req: Request, res: Response) => {
  const resortName = decodeURIComponent(req.params.resort);
  const coords = RESORT_COORDS[resortName];

  if (!coords) {
    res.status(404).json({ error: 'Resort not found', availableResorts: Object.keys(RESORT_COORDS) });
    return;
  }

  // If no API key, return mock weather data
  if (!OPENWEATHER_API_KEY) {
    res.json({
      resort: resortName,
      current: {
        temp: Math.random() * 10 - 5, // -5 to 5°C
        snow: Math.random() * 5, // 0-5 inches
        conditions: 'Snow',
      },
      forecast: {
        snowfall7Days: Math.random() * 20, // 0-20 inches predicted
        confidence: 0.75,
      },
      source: 'mock-data',
    });
    return;
  }

  try {
    // Get current weather
    const currentWeather = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${OPENWEATHER_API_KEY}&units=imperial`
    );

    // Get 5-day forecast
    const forecast = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${OPENWEATHER_API_KEY}&units=imperial`
    );

    // Calculate total predicted snowfall
    let totalSnow = 0;
    forecast.data.list.forEach((item: any) => {
      if (item.snow && item.snow['3h']) {
        // Convert mm to inches
        totalSnow += item.snow['3h'] / 25.4;
      }
    });

    res.json({
      resort: resortName,
      current: {
        temp: currentWeather.data.main.temp,
        snow: currentWeather.data.snow?.['1h'] ? currentWeather.data.snow['1h'] / 25.4 : 0,
        conditions: currentWeather.data.weather[0]?.description || 'Unknown',
      },
      forecast: {
        snowfall5Days: parseFloat(totalSnow.toFixed(2)),
        periods: forecast.data.list.slice(0, 8).map((item: any) => ({
          time: item.dt_txt,
          temp: item.main.temp,
          snow: item.snow?.['3h'] ? (item.snow['3h'] / 25.4).toFixed(2) : 0,
        })),
      },
      source: 'openweathermap',
    });
  } catch (error) {
    console.error('Weather API error:', error);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// Settle market info (settlement done via Remix/MetaMask)
app.post('/api/markets/:id/settle', async (req: Request, res: Response) => {
  const adminKey = req.headers['x-admin-key'];

  if (adminKey !== process.env.ADMIN_KEY) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }

  const marketId = parseInt(req.params.id);
  const { actualSnowfall } = req.body;

  if (isNaN(marketId) || actualSnowfall === undefined) {
    res.status(400).json({ error: 'Invalid parameters' });
    return;
  }

  // Convert snowfall to scaled value (multiply by 100)
  const scaledSnowfall = Math.round(actualSnowfall * 100);

  // Return instructions for settling via Remix/MetaMask
  res.json({
    message: 'Settle this market via Remix IDE with MetaMask',
    instructions: {
      step1: 'Open Remix IDE and load SnowMarket contract',
      step2: 'Connect MetaMask to Monad Testnet',
      step3: `Call resolveMarket(${marketId}, ${scaledSnowfall})`,
      step4: 'Confirm transaction in MetaMask',
    },
    marketId,
    actualSnowfall,
    scaledSnowfall,
    contractAddress: SNOW_MARKET_ADDRESS,
  });
});

// Get user position
app.get('/api/markets/:id/position/:address', async (req: Request, res: Response) => {
  setupProvider();
  const marketId = parseInt(req.params.id);
  const userAddress = req.params.address;

  if (isNaN(marketId) || !ethers.isAddress(userAddress)) {
    res.status(400).json({ error: 'Invalid parameters' });
    return;
  }

  if (!snowMarket) {
    res.json({ yesShares: '0', noShares: '0' });
    return;
  }

  try {
    const position = await snowMarket.getPosition(marketId, userAddress);
    res.json({
      yesShares: position.yesShares.toString(),
      noShares: position.noShares.toString(),
    });
  } catch (error) {
    console.error('Error fetching position:', error);
    res.status(500).json({ error: 'Failed to fetch position' });
  }
});

// Contract info endpoint
app.get('/api/contracts', (req: Request, res: Response) => {
  res.json({
    snowMarket: SNOW_MARKET_ADDRESS || 'Not deployed',
    mockUsdc: MOCK_USDC_ADDRESS || 'Not deployed',
    network: 'Monad Testnet',
    chainId: 10143,
    rpcUrl: RPC_URL,
  });
});

// Get resort info including webcams (free)
app.get('/api/resort/:resort', (req: Request, res: Response) => {
  const resortName = decodeURIComponent(req.params.resort);
  const resortInfo = RESORT_DATA[resortName];

  if (!resortInfo) {
    res.status(404).json({ error: 'Resort not found', availableResorts: Object.keys(RESORT_DATA) });
    return;
  }

  res.json({
    name: resortName,
    elevation: resortInfo.elevation,
    coordinates: { lat: resortInfo.lat, lon: resortInfo.lon },
    webcams: resortInfo.webcams,
    website: resortInfo.website,
  });
});

// Get all resorts info (free)
app.get('/api/resorts', (req: Request, res: Response) => {
  const resorts = Object.entries(RESORT_DATA).map(([name, data]) => ({
    name,
    elevation: data.elevation,
    coordinates: { lat: data.lat, lon: data.lon },
    webcams: data.webcams,
    website: data.website,
  }));
  res.json({ resorts });
});

// Combined weather + resort info endpoint (free)
app.get('/api/forecast/:resort', async (req: Request, res: Response) => {
  const resortName = decodeURIComponent(req.params.resort);
  const resortInfo = RESORT_DATA[resortName];

  if (!resortInfo) {
    res.status(404).json({ error: 'Resort not found', availableResorts: Object.keys(RESORT_DATA) });
    return;
  }

  // If no API key, return mock weather data
  if (!OPENWEATHER_API_KEY) {
    const mockSnow24h = Math.random() * 8;
    const mockSnow48h = mockSnow24h + Math.random() * 6;
    const mockSnow7d = mockSnow48h + Math.random() * 12;

    res.json({
      resort: resortName,
      elevation: resortInfo.elevation,
      webcams: resortInfo.webcams,
      website: resortInfo.website,
      current: {
        temp: Math.round(20 + Math.random() * 15), // 20-35°F
        conditions: ['Snow', 'Light Snow', 'Heavy Snow', 'Partly Cloudy', 'Clear'][Math.floor(Math.random() * 5)],
        windSpeed: Math.round(5 + Math.random() * 20),
        humidity: Math.round(50 + Math.random() * 40),
      },
      forecast: {
        snow24h: parseFloat(mockSnow24h.toFixed(1)),
        snow48h: parseFloat(mockSnow48h.toFixed(1)),
        snow7d: parseFloat(mockSnow7d.toFixed(1)),
        trend: mockSnow7d > 10 ? 'Heavy snow expected' : mockSnow7d > 5 ? 'Moderate snow expected' : 'Light snow expected',
      },
      lastUpdated: new Date().toISOString(),
      source: 'mock-data',
    });
    return;
  }

  try {
    // Get current weather and 5-day forecast from OpenWeatherMap
    const [currentRes, forecastRes] = await Promise.all([
      axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${resortInfo.lat}&lon=${resortInfo.lon}&appid=${OPENWEATHER_API_KEY}&units=imperial`),
      axios.get(`https://api.openweathermap.org/data/2.5/forecast?lat=${resortInfo.lat}&lon=${resortInfo.lon}&appid=${OPENWEATHER_API_KEY}&units=imperial`),
    ]);

    // Calculate snowfall totals
    let snow24h = 0;
    let snow48h = 0;
    let snow5d = 0;

    forecastRes.data.list.forEach((item: any, idx: number) => {
      const snowMm = item.snow?.['3h'] || 0;
      const snowInches = snowMm / 25.4;

      if (idx < 8) snow24h += snowInches;
      if (idx < 16) snow48h += snowInches;
      snow5d += snowInches;
    });

    res.json({
      resort: resortName,
      elevation: resortInfo.elevation,
      webcams: resortInfo.webcams,
      website: resortInfo.website,
      current: {
        temp: Math.round(currentRes.data.main.temp),
        conditions: currentRes.data.weather[0]?.description || 'Unknown',
        windSpeed: Math.round(currentRes.data.wind?.speed || 0),
        humidity: currentRes.data.main.humidity,
      },
      forecast: {
        snow24h: parseFloat(snow24h.toFixed(1)),
        snow48h: parseFloat(snow48h.toFixed(1)),
        snow5d: parseFloat(snow5d.toFixed(1)),
        trend: snow5d > 10 ? 'Heavy snow expected' : snow5d > 5 ? 'Moderate snow expected' : 'Light snow expected',
      },
      lastUpdated: new Date().toISOString(),
      source: 'openweathermap',
    });
  } catch (error) {
    console.error('Forecast API error:', error);
    res.status(500).json({ error: 'Failed to fetch forecast data' });
  }
});

// ========================================
// x402 Beer Purchase Endpoints
// ========================================

// Buy beer with x402 payment - $9 per beer
app.post('/api/buy-beer', x402Middleware(BEER_PRICE_USD), async (req: Request, res: Response) => {
  const { walletAddress, resort, beers = 1 } = req.body;

  if (!walletAddress || !ethers.isAddress(walletAddress)) {
    res.status(400).json({ error: 'Valid wallet address required' });
    return;
  }

  if (!resort) {
    res.status(400).json({ error: 'Resort name required' });
    return;
  }

  const numBeers = Math.max(1, Math.min(10, parseInt(beers) || 1)); // 1-10 beers per purchase
  const totalCost = numBeers * BEER_PRICE_USD;

  // Create voucher
  const voucher: BeerVoucher = {
    id: generateVoucherId(),
    walletAddress: walletAddress.toLowerCase(),
    beers: numBeers,
    amountPaid: totalCost,
    resort,
    createdAt: Date.now(),
    redeemed: false,
    redemptionCode: generateRedemptionCode(),
  };

  beerVouchers.push(voucher);

  // Track payment
  payments.push({
    address: walletAddress,
    amount: totalCost,
    timestamp: Date.now(),
    endpoint: '/api/buy-beer',
  });

  res.json({
    success: true,
    voucher: {
      id: voucher.id,
      beers: voucher.beers,
      resort: voucher.resort,
      redemptionCode: voucher.redemptionCode,
      totalPaid: `$${totalCost}`,
      message: `Congratulations! You've purchased ${numBeers} lodge beer${numBeers > 1 ? 's' : ''} at ${resort}!`,
      instructions: [
        `Show this code at the ${resort} lodge bar`,
        `Redemption Code: ${voucher.redemptionCode}`,
        'Valid for any draft beer on tap',
        'Must be 21+ to redeem',
      ],
    },
    x402: {
      protocol: 'x402',
      amountCharged: totalCost,
      currency: 'USD',
    },
  });
});

// Get beer price info (free - for UI display)
app.get('/api/beer-price', (req: Request, res: Response) => {
  res.json({
    pricePerBeer: BEER_PRICE_USD,
    currency: 'USD',
    description: 'Ski lodge draft beer',
    paymentProtocol: 'x402',
    availableResorts: Object.keys(RESORT_DATA),
  });
});

// Get vouchers for a wallet address
app.get('/api/vouchers/:address', (req: Request, res: Response) => {
  const walletAddress = req.params.address.toLowerCase();

  if (!ethers.isAddress(walletAddress)) {
    res.status(400).json({ error: 'Invalid wallet address' });
    return;
  }

  const userVouchers = beerVouchers.filter(v => v.walletAddress === walletAddress);

  res.json({
    address: walletAddress,
    vouchers: userVouchers.map(v => ({
      id: v.id,
      beers: v.beers,
      resort: v.resort,
      redemptionCode: v.redemptionCode,
      redeemed: v.redeemed,
      createdAt: new Date(v.createdAt).toISOString(),
    })),
    totalBeers: userVouchers.filter(v => !v.redeemed).reduce((sum, v) => sum + v.beers, 0),
  });
});

// Redeem a voucher (for lodge operators)
app.post('/api/vouchers/:id/redeem', (req: Request, res: Response) => {
  const voucherId = req.params.id;
  const { redemptionCode } = req.body;

  const voucher = beerVouchers.find(v => v.id === voucherId);

  if (!voucher) {
    res.status(404).json({ error: 'Voucher not found' });
    return;
  }

  if (voucher.redeemed) {
    res.status(400).json({ error: 'Voucher already redeemed' });
    return;
  }

  if (voucher.redemptionCode !== redemptionCode) {
    res.status(400).json({ error: 'Invalid redemption code' });
    return;
  }

  voucher.redeemed = true;

  res.json({
    success: true,
    message: `Voucher redeemed! Serve ${voucher.beers} beer${voucher.beers > 1 ? 's' : ''}.`,
    voucher: {
      id: voucher.id,
      beers: voucher.beers,
      resort: voucher.resort,
      redeemedAt: new Date().toISOString(),
    },
  });
});

// Beer Leaderboard endpoint
app.get('/api/leaderboard', (req: Request, res: Response) => {
  // Aggregate stats by wallet address
  const userStats: { [address: string]: { totalBeers: number; redeemedBeers: number; pendingBeers: number; totalSpent: number; favoriteResort: string; resortCounts: { [resort: string]: number } } } = {};

  beerVouchers.forEach((voucher) => {
    const addr = voucher.walletAddress.toLowerCase();
    if (!userStats[addr]) {
      userStats[addr] = {
        totalBeers: 0,
        redeemedBeers: 0,
        pendingBeers: 0,
        totalSpent: 0,
        favoriteResort: '',
        resortCounts: {},
      };
    }

    userStats[addr].totalBeers += voucher.beers;
    userStats[addr].totalSpent += voucher.amountPaid;

    if (voucher.redeemed) {
      userStats[addr].redeemedBeers += voucher.beers;
    } else {
      userStats[addr].pendingBeers += voucher.beers;
    }

    // Track resort counts for favorite
    userStats[addr].resortCounts[voucher.resort] = (userStats[addr].resortCounts[voucher.resort] || 0) + voucher.beers;
  });

  // Calculate favorite resort for each user
  Object.keys(userStats).forEach((addr) => {
    const resortCounts = userStats[addr].resortCounts;
    let maxCount = 0;
    let favoriteResort = '';
    Object.entries(resortCounts).forEach(([resort, count]) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteResort = resort;
      }
    });
    userStats[addr].favoriteResort = favoriteResort;
  });

  // Convert to leaderboard array and sort by total beers
  const leaderboard = Object.entries(userStats)
    .map(([address, stats]) => ({
      rank: 0,
      address,
      nickname: userNicknames[address] || `Skier${address.slice(2, 6)}`,
      totalBeers: stats.totalBeers,
      redeemedBeers: stats.redeemedBeers,
      pendingBeers: stats.pendingBeers,
      totalSpent: stats.totalSpent,
      favoriteResort: stats.favoriteResort,
    }))
    .sort((a, b) => b.totalBeers - a.totalBeers)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  // Calculate global stats
  const globalStats = {
    totalUsers: leaderboard.length,
    totalBeers: leaderboard.reduce((sum, u) => sum + u.totalBeers, 0),
    totalRedeemed: leaderboard.reduce((sum, u) => sum + u.redeemedBeers, 0),
    totalPending: leaderboard.reduce((sum, u) => sum + u.pendingBeers, 0),
    totalSpent: leaderboard.reduce((sum, u) => sum + u.totalSpent, 0),
  };

  res.json({
    leaderboard,
    globalStats,
    lastUpdated: new Date().toISOString(),
  });
});

// ========================================
// Friends Circle Endpoints
// ========================================

// Get user's friends circle
app.get('/api/circles/:address', (req: Request, res: Response) => {
  const ownerAddress = req.params.address.toLowerCase();

  if (!ethers.isAddress(ownerAddress)) {
    res.status(400).json({ error: 'Invalid wallet address' });
    return;
  }

  const circle = userCircles[ownerAddress];

  if (!circle) {
    res.json({
      ownerAddress,
      friends: [],
      createdAt: null,
      updatedAt: null,
    });
    return;
  }

  // Enrich friends with nicknames if available
  const enrichedFriends = circle.friends.map((friend) => ({
    ...friend,
    nickname: userNicknames[friend.address.toLowerCase()] || null,
  }));

  res.json({
    ownerAddress: circle.ownerAddress,
    friends: enrichedFriends,
    createdAt: circle.createdAt,
    updatedAt: circle.updatedAt,
  });
});

// Add a friend to circle
app.post('/api/circles/:address/friends', (req: Request, res: Response) => {
  const ownerAddress = req.params.address.toLowerCase();
  const { friendAddress, label } = req.body;

  if (!ethers.isAddress(ownerAddress)) {
    res.status(400).json({ error: 'Invalid owner address' });
    return;
  }

  if (!friendAddress || !ethers.isAddress(friendAddress)) {
    res.status(400).json({ error: 'Valid friend address required' });
    return;
  }

  if (!label || typeof label !== 'string' || label.trim().length === 0) {
    res.status(400).json({ error: 'Label required' });
    return;
  }

  const normalizedFriendAddress = friendAddress.toLowerCase();

  // Create circle if doesn't exist
  if (!userCircles[ownerAddress]) {
    userCircles[ownerAddress] = {
      ownerAddress,
      friends: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  // Check if friend already exists
  const existingFriend = userCircles[ownerAddress].friends.find(
    (f) => f.address.toLowerCase() === normalizedFriendAddress
  );

  if (existingFriend) {
    res.status(400).json({ error: 'Friend already in circle' });
    return;
  }

  // Add friend
  const newFriend: Friend = {
    address: normalizedFriendAddress,
    label: label.trim(),
    addedAt: Date.now(),
  };

  userCircles[ownerAddress].friends.push(newFriend);
  userCircles[ownerAddress].updatedAt = Date.now();

  res.json({
    success: true,
    friend: {
      ...newFriend,
      nickname: userNicknames[normalizedFriendAddress] || null,
    },
  });
});

// Update a friend's label
app.put('/api/circles/:address/friends/:friendAddress', (req: Request, res: Response) => {
  const ownerAddress = req.params.address.toLowerCase();
  const friendAddress = req.params.friendAddress.toLowerCase();
  const { label } = req.body;

  if (!ethers.isAddress(ownerAddress) || !ethers.isAddress(friendAddress)) {
    res.status(400).json({ error: 'Invalid address' });
    return;
  }

  if (!label || typeof label !== 'string' || label.trim().length === 0) {
    res.status(400).json({ error: 'Label required' });
    return;
  }

  const circle = userCircles[ownerAddress];
  if (!circle) {
    res.status(404).json({ error: 'Circle not found' });
    return;
  }

  const friend = circle.friends.find((f) => f.address.toLowerCase() === friendAddress);
  if (!friend) {
    res.status(404).json({ error: 'Friend not found in circle' });
    return;
  }

  friend.label = label.trim();
  circle.updatedAt = Date.now();

  res.json({
    success: true,
    friend: {
      ...friend,
      nickname: userNicknames[friendAddress] || null,
    },
  });
});

// Remove a friend from circle
app.delete('/api/circles/:address/friends/:friendAddress', (req: Request, res: Response) => {
  const ownerAddress = req.params.address.toLowerCase();
  const friendAddress = req.params.friendAddress.toLowerCase();

  if (!ethers.isAddress(ownerAddress) || !ethers.isAddress(friendAddress)) {
    res.status(400).json({ error: 'Invalid address' });
    return;
  }

  const circle = userCircles[ownerAddress];
  if (!circle) {
    res.status(404).json({ error: 'Circle not found' });
    return;
  }

  const friendIndex = circle.friends.findIndex((f) => f.address.toLowerCase() === friendAddress);
  if (friendIndex === -1) {
    res.status(404).json({ error: 'Friend not found in circle' });
    return;
  }

  circle.friends.splice(friendIndex, 1);
  circle.updatedAt = Date.now();

  res.json({ success: true });
});

// Get friends' positions for a specific market
app.get('/api/circles/:address/positions/:marketId', async (req: Request, res: Response) => {
  const ownerAddress = req.params.address.toLowerCase();
  const marketId = parseInt(req.params.marketId);

  if (!ethers.isAddress(ownerAddress)) {
    res.status(400).json({ error: 'Invalid wallet address' });
    return;
  }

  if (isNaN(marketId)) {
    res.status(400).json({ error: 'Invalid market ID' });
    return;
  }

  const circle = userCircles[ownerAddress];
  if (!circle || circle.friends.length === 0) {
    res.json({ marketId, friendPositions: [] });
    return;
  }

  // Get positions for all friends (using simulated data for demo, would query blockchain in production)
  const friendPositions = circle.friends.map((friend) => {
    const position = simulatedPositions.find(
      (p) => p.marketId === marketId && p.address.toLowerCase() === friend.address.toLowerCase()
    );

    return {
      address: friend.address,
      label: friend.label,
      nickname: userNicknames[friend.address.toLowerCase()] || null,
      yesShares: position?.yesShares || 0,
      noShares: position?.noShares || 0,
      netPosition: (position?.yesShares || 0) - (position?.noShares || 0),
      hasPosition: position ? (position.yesShares > 0 || position.noShares > 0) : false,
    };
  });

  // Sort by net position (most bullish first)
  friendPositions.sort((a, b) => b.netPosition - a.netPosition);

  res.json({
    marketId,
    friendPositions,
    summary: {
      totalFriends: friendPositions.length,
      friendsWithPositions: friendPositions.filter((f) => f.hasPosition).length,
      totalYesShares: friendPositions.reduce((sum, f) => sum + f.yesShares, 0),
      totalNoShares: friendPositions.reduce((sum, f) => sum + f.noShares, 0),
    },
  });
});

// Get all positions for friends across all markets
app.get('/api/circles/:address/all-positions', async (req: Request, res: Response) => {
  const ownerAddress = req.params.address.toLowerCase();

  if (!ethers.isAddress(ownerAddress)) {
    res.status(400).json({ error: 'Invalid wallet address' });
    return;
  }

  const circle = userCircles[ownerAddress];
  if (!circle || circle.friends.length === 0) {
    res.json({ positions: {} });
    return;
  }

  // Group positions by market
  const positionsByMarket: { [marketId: number]: Array<{
    address: string;
    label: string;
    nickname: string | null;
    yesShares: number;
    noShares: number;
    netPosition: number;
  }> } = {};

  circle.friends.forEach((friend) => {
    const friendPositions = simulatedPositions.filter(
      (p) => p.address.toLowerCase() === friend.address.toLowerCase()
    );

    friendPositions.forEach((pos) => {
      if (!positionsByMarket[pos.marketId]) {
        positionsByMarket[pos.marketId] = [];
      }

      positionsByMarket[pos.marketId].push({
        address: friend.address,
        label: friend.label,
        nickname: userNicknames[friend.address.toLowerCase()] || null,
        yesShares: pos.yesShares,
        noShares: pos.noShares,
        netPosition: pos.yesShares - pos.noShares,
      });
    });
  });

  res.json({ positions: positionsByMarket });
});

// x402 payment info endpoint (for wallets to know how to pay)
app.get('/api/x402/info', (req: Request, res: Response) => {
  res.json({
    protocol: 'x402',
    version: '1.0',
    paymentAddress: process.env.PAYMENT_ADDRESS || '0xb103a5867d1bf1a4239410c10ec968a5a190231e',
    paymentNetwork: 'monad-testnet',
    chainId: 10143,
    acceptedTokens: [
      {
        symbol: 'USDC',
        address: MOCK_USDC_ADDRESS || '0xBDB5976d7a9712089c175e62790777EFFC885Eb6',
        decimals: 6,
      },
    ],
    endpoints: [
      { path: '/api/buy-beer', method: 'POST', price: BEER_PRICE_USD, description: 'Buy a lodge beer' },
      { path: '/api/markets/:id', method: 'GET', price: 0.001, description: 'Market details' },
      { path: '/api/weather/:resort', method: 'GET', price: 0.01, description: 'Weather data' },
    ],
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                 PowGuess Backend API                     ║
╠══════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}               ║
║                                                          ║
║  Endpoints:                                              ║
║  • GET  /api/health           - Health check             ║
║  • GET  /api/markets          - List all markets         ║
║  • GET  /api/markets/:id      - Market details ($0.001)  ║
║  • GET  /api/weather/:resort  - Weather data ($0.01)     ║
║  • POST /api/markets/:id/settle - Settle market (admin)  ║
║  • GET  /api/contracts        - Contract addresses       ║
║                                                          ║
║  x402 Beer Purchase:                                     ║
║  • POST /api/buy-beer         - Buy beer ($9 x402)       ║
║  • GET  /api/beer-price       - Get beer price info      ║
║  • GET  /api/vouchers/:addr   - Get user's vouchers      ║
║  • POST /api/vouchers/:id/redeem - Redeem voucher        ║
║  • GET  /api/x402/info        - x402 payment info        ║
║  • GET  /api/leaderboard      - Beer leaderboard         ║
║                                                          ║
║  Friends Circle:                                         ║
║  • GET  /api/circles/:addr    - Get friends circle       ║
║  • POST /api/circles/:addr/friends - Add friend          ║
║  • PUT  /api/circles/:addr/friends/:friend - Update      ║
║  • DELETE /api/circles/:addr/friends/:friend - Remove    ║
║  • GET  /api/circles/:addr/positions/:marketId           ║
║  • GET  /api/circles/:addr/all-positions                 ║
╚══════════════════════════════════════════════════════════╝
  `);
});

export default app;

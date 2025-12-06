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
╚══════════════════════════════════════════════════════════╝
  `);
});

export default app;

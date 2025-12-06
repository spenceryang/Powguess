const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface Market {
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

export interface WeatherData {
  resort: string;
  current: {
    temp: number;
    snow: number;
    conditions: string;
  };
  forecast: {
    snowfall7Days?: number;
    snowfall5Days?: number;
    confidence?: number;
  };
  source: string;
}

export async function fetchMarkets(): Promise<Market[]> {
  const res = await fetch(`${API_URL}/api/markets`);
  if (!res.ok) throw new Error("Failed to fetch markets");
  const data = await res.json();
  return data.markets;
}

export async function fetchMarket(id: number): Promise<Market> {
  const res = await fetch(`${API_URL}/api/markets/${id}`, {
    headers: {
      "x-402-payment": "demo-bypass",
    },
  });
  if (!res.ok) throw new Error("Failed to fetch market");
  const data = await res.json();
  return data.market;
}

export async function fetchWeather(resort: string): Promise<WeatherData> {
  const res = await fetch(`${API_URL}/api/weather/${encodeURIComponent(resort)}`, {
    headers: {
      "x-402-payment": "demo-bypass",
    },
  });
  if (!res.ok) throw new Error("Failed to fetch weather");
  return res.json();
}

export async function fetchPosition(
  marketId: number,
  address: string
): Promise<{ yesShares: string; noShares: string }> {
  const res = await fetch(`${API_URL}/api/markets/${marketId}/position/${address}`);
  if (!res.ok) throw new Error("Failed to fetch position");
  return res.json();
}

export async function fetchContracts(): Promise<{
  snowMarket: string;
  mockUsdc: string;
  network: string;
  chainId: number;
  rpcUrl: string;
}> {
  const res = await fetch(`${API_URL}/api/contracts`);
  if (!res.ok) throw new Error("Failed to fetch contracts");
  return res.json();
}

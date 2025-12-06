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

export interface Webcam {
  name: string;
  url: string;
  embedUrl?: string;
}

export interface ForecastData {
  resort: string;
  elevation: number;
  webcams: Webcam[];
  website: string;
  current: {
    temp: number;
    conditions: string;
    windSpeed: number;
    humidity: number;
  };
  forecast: {
    snow24h: number;
    snow48h: number;
    snow7d?: number;
    snow5d?: number;
    trend: string;
  };
  lastUpdated: string;
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

export async function fetchForecast(resort: string): Promise<ForecastData> {
  const res = await fetch(`${API_URL}/api/forecast/${encodeURIComponent(resort)}`);
  if (!res.ok) throw new Error("Failed to fetch forecast");
  return res.json();
}

// x402 Beer Purchase Types
export interface BeerVoucher {
  id: string;
  beers: number;
  resort: string;
  redemptionCode: string;
  totalPaid: string;
  message: string;
  instructions: string[];
}

export interface BeerPurchaseResponse {
  success: boolean;
  voucher: BeerVoucher;
  x402: {
    protocol: string;
    amountCharged: number;
    currency: string;
  };
}

export interface UserVouchersResponse {
  address: string;
  vouchers: {
    id: string;
    beers: number;
    resort: string;
    redemptionCode: string;
    redeemed: boolean;
    createdAt: string;
  }[];
  totalBeers: number;
}

export interface BeerPriceInfo {
  pricePerBeer: number;
  currency: string;
  description: string;
  paymentProtocol: string;
  availableResorts: string[];
}

// x402 Beer Purchase Functions
export async function fetchBeerPrice(): Promise<BeerPriceInfo> {
  const res = await fetch(`${API_URL}/api/beer-price`);
  if (!res.ok) throw new Error("Failed to fetch beer price");
  return res.json();
}

export async function buyBeer(
  walletAddress: string,
  resort: string,
  beers: number = 1
): Promise<BeerPurchaseResponse> {
  const res = await fetch(`${API_URL}/api/buy-beer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-402-payment": "demo-bypass", // For demo, bypasses payment requirement
      "x-402-payer": walletAddress,
    },
    body: JSON.stringify({ walletAddress, resort, beers }),
  });

  if (res.status === 402) {
    const paymentInfo = await res.json();
    throw new Error(`Payment required: $${paymentInfo.price} ${paymentInfo.currency}`);
  }

  if (!res.ok) throw new Error("Failed to buy beer");
  return res.json();
}

export async function fetchUserVouchers(address: string): Promise<UserVouchersResponse> {
  const res = await fetch(`${API_URL}/api/vouchers/${address}`);
  if (!res.ok) throw new Error("Failed to fetch vouchers");
  return res.json();
}

export async function fetchX402Info(): Promise<{
  protocol: string;
  version: string;
  paymentAddress: string;
  paymentNetwork: string;
  chainId: number;
  acceptedTokens: { symbol: string; address: string; decimals: number }[];
  endpoints: { path: string; method: string; price: number; description: string }[];
}> {
  const res = await fetch(`${API_URL}/api/x402/info`);
  if (!res.ok) throw new Error("Failed to fetch x402 info");
  return res.json();
}

// Leaderboard Types
export interface LeaderboardEntry {
  rank: number;
  address: string;
  nickname: string;
  totalBeers: number;
  redeemedBeers: number;
  pendingBeers: number;
  totalSpent: number;
  favoriteResort: string;
}

export interface LeaderboardStats {
  totalUsers: number;
  totalBeers: number;
  totalRedeemed: number;
  totalPending: number;
  totalSpent: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  globalStats: LeaderboardStats;
  lastUpdated: string;
}

export async function fetchLeaderboard(): Promise<LeaderboardResponse> {
  const res = await fetch(`${API_URL}/api/leaderboard`);
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json();
}

// Friends Circle Types
export interface Friend {
  address: string;
  label: string;
  addedAt: number;
  nickname: string | null;
}

export interface FriendsCircle {
  ownerAddress: string;
  friends: Friend[];
  createdAt: number | null;
  updatedAt: number | null;
}

export interface FriendPosition {
  address: string;
  label: string;
  nickname: string | null;
  yesShares: number;
  noShares: number;
  netPosition: number;
  hasPosition: boolean;
}

export interface FriendPositionsResponse {
  marketId: number;
  friendPositions: FriendPosition[];
  summary: {
    totalFriends: number;
    friendsWithPositions: number;
    totalYesShares: number;
    totalNoShares: number;
  };
}

// Friends Circle Functions
export async function fetchFriendsCircle(address: string): Promise<FriendsCircle> {
  const res = await fetch(`${API_URL}/api/circles/${address}`);
  if (!res.ok) throw new Error("Failed to fetch friends circle");
  return res.json();
}

export async function addFriend(
  ownerAddress: string,
  friendAddress: string,
  label: string
): Promise<{ success: boolean; friend: Friend }> {
  const res = await fetch(`${API_URL}/api/circles/${ownerAddress}/friends`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ friendAddress, label }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to add friend");
  }
  return res.json();
}

export async function updateFriendLabel(
  ownerAddress: string,
  friendAddress: string,
  label: string
): Promise<{ success: boolean; friend: Friend }> {
  const res = await fetch(`${API_URL}/api/circles/${ownerAddress}/friends/${friendAddress}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update friend");
  }
  return res.json();
}

export async function removeFriend(
  ownerAddress: string,
  friendAddress: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/api/circles/${ownerAddress}/friends/${friendAddress}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to remove friend");
  }
  return res.json();
}

export async function fetchFriendPositions(
  ownerAddress: string,
  marketId: number
): Promise<FriendPositionsResponse> {
  const res = await fetch(`${API_URL}/api/circles/${ownerAddress}/positions/${marketId}`);
  if (!res.ok) throw new Error("Failed to fetch friend positions");
  return res.json();
}

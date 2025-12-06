"use client";

import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import MarketCard from "@/components/MarketCard";
import { fetchMarkets, type Market } from "@/lib/api";

export default function Home() {
  const { data: markets, isLoading, error, refetch } = useQuery<Market[]>({
    queryKey: ["markets"],
    queryFn: fetchMarkets,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-snow-900 to-snow-800">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Predict the Powder
        </h2>
        <p className="text-xl text-snow-400 max-w-2xl mx-auto mb-8">
          Bet on snowfall at top ski resorts. Buy YES or NO shares at $0.50 each
          and win if you predict correctly!
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <div className="bg-snow-800 border border-snow-700 rounded-lg px-4 py-2">
            <span className="text-snow-400">Fixed Price:</span>
            <span className="text-white font-medium ml-2">$0.50/share</span>
          </div>
          <div className="bg-snow-800 border border-snow-700 rounded-lg px-4 py-2">
            <span className="text-snow-400">Network:</span>
            <span className="text-blue-400 font-medium ml-2">Monad Testnet</span>
          </div>
          <div className="bg-snow-800 border border-snow-700 rounded-lg px-4 py-2">
            <span className="text-snow-400">Currency:</span>
            <span className="text-green-400 font-medium ml-2">USDC</span>
          </div>
        </div>
      </section>

      {/* Markets Section */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-white">Active Markets</h3>
          <button
            onClick={() => refetch()}
            className="bg-snow-700 hover:bg-snow-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Refresh
          </button>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-snow-800 rounded-xl border border-snow-700 h-96 animate-pulse"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-center">
            <p className="text-red-400">Failed to load markets. Make sure the backend is running.</p>
            <button
              onClick={() => refetch()}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {markets && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                onRefresh={() => refetch()}
              />
            ))}
          </div>
        )}

        {markets && markets.length === 0 && (
          <div className="bg-snow-800 border border-snow-700 rounded-xl p-12 text-center">
            <p className="text-snow-400 text-lg">No markets available yet.</p>
            <p className="text-snow-500 mt-2">Check back later or deploy the contracts!</p>
          </div>
        )}
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 py-12 border-t border-snow-700">
        <h3 className="text-2xl font-bold text-white mb-8 text-center">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">1</span>
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">Choose a Resort</h4>
            <p className="text-snow-400">
              Pick from Mammoth, Palisades Tahoe, Jackson Hole, Snowbird, or Aspen
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">2</span>
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">Buy Shares</h4>
            <p className="text-snow-400">
              Buy YES if you think it will snow the target amount, NO if you don't
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">3</span>
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">Claim Winnings</h4>
            <p className="text-snow-400">
              When the market resolves, winners split the total pool proportionally
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-snow-700 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-snow-500">
          <p>PowGuess - Built on Monad Testnet</p>
          <p className="text-sm mt-2">
            Weather data powered by OpenWeather | x402 micropayments enabled
          </p>
        </div>
      </footer>
    </main>
  );
}

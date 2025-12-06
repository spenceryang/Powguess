"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import MarketCard from "@/components/MarketCard";
import { fetchMarkets, type Market } from "@/lib/api";
import { useBeerMode } from "@/lib/BeerModeContext";

function Snowflakes() {
  const [flakes, setFlakes] = useState<Array<{ id: number; left: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    const newFlakes = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 10 + Math.random() * 20,
    }));
    setFlakes(newFlakes);
  }, []);

  return (
    <>
      {flakes.map((flake) => (
        <div
          key={flake.id}
          className="snowflake"
          style={{
            left: `${flake.left}%`,
            animationDelay: `${flake.delay}s`,
            animationDuration: `${flake.duration}s`,
          }}
        >
          *
        </div>
      ))}
    </>
  );
}

export default function Home() {
  const { data: markets, isLoading, error, refetch } = useQuery<Market[]>({
    queryKey: ["markets"],
    queryFn: fetchMarkets,
    refetchInterval: 30000,
  });
  const { beerMode, toBeer } = useBeerMode();

  return (
    <main style={{ minHeight: "100vh", position: "relative" }}>
      <Snowflakes />
      <Header />

      {/* Hero Section */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 16px", textAlign: "center", position: "relative", zIndex: 10 }}>
        <h2 className="gradient-text" style={{ fontSize: "3rem", fontWeight: "800", marginBottom: "16px" }}>
          Predict the Powder
        </h2>
        <p style={{ fontSize: "1.25rem", color: "#94a3b8", maxWidth: "600px", margin: "0 auto 32px" }}>
          {beerMode
            ? "Bet on snowfall at top ski resorts. Risk a few sips of beer to win big when you predict correctly!"
            : "Bet on snowfall at top ski resorts. Buy YES or NO shares at $0.50 each and win if you predict correctly!"
          }
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "16px" }}>
          <div className="glass-card" style={{
            padding: "12px 20px",
            border: beerMode ? "1px solid rgba(251, 191, 36, 0.3)" : undefined,
            background: beerMode ? "rgba(251, 191, 36, 0.1)" : undefined,
          }}>
            <span style={{ color: "#94a3b8" }}>Fixed Price:</span>
            <span style={{ color: beerMode ? "#fbbf24" : "#38bdf8", fontWeight: "600", marginLeft: "8px" }}>
              {beerMode ? `${toBeer(0.5)}/share 🍺` : "$0.50/share"}
            </span>
          </div>
          <div className="glass-card" style={{ padding: "12px 20px" }}>
            <span style={{ color: "#94a3b8" }}>Network:</span>
            <span style={{ color: "#a78bfa", fontWeight: "600", marginLeft: "8px" }}>Monad Testnet</span>
          </div>
          <div className="glass-card" style={{
            padding: "12px 20px",
            border: beerMode ? "1px solid rgba(251, 191, 36, 0.3)" : undefined,
            background: beerMode ? "rgba(251, 191, 36, 0.1)" : undefined,
          }}>
            <span style={{ color: "#94a3b8" }}>Currency:</span>
            <span style={{ color: beerMode ? "#fbbf24" : "#4ade80", fontWeight: "600", marginLeft: "8px" }}>
              {beerMode ? "Lodge Beers 🍺" : "USDC"}
            </span>
          </div>
        </div>
        {beerMode && (
          <p style={{ color: "#fbbf24", fontSize: "0.85rem", marginTop: "16px", opacity: 0.8 }}>
            🍺 Beer Mode Active! All prices shown in ski lodge beers ($9 each)
          </p>
        )}
      </section>

      {/* Markets Section */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 16px 48px", position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: "white" }}>Active Markets</h3>
          <button
            onClick={() => refetch()}
            className="glass-card"
            style={{ padding: "8px 16px", cursor: "pointer", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)" }}
          >
            Refresh
          </button>
        </div>

        {isLoading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "24px" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="glass-card" style={{ height: "400px", animation: "pulse 2s infinite" }} />
            ))}
          </div>
        )}

        {error && (
          <div className="glass-card" style={{ padding: "48px", textAlign: "center", borderColor: "rgba(239, 68, 68, 0.3)" }}>
            <p style={{ color: "#f87171", marginBottom: "16px" }}>Failed to load markets. Make sure the backend is running.</p>
            <button onClick={() => refetch()} className="btn-no">
              Try Again
            </button>
          </div>
        )}

        {markets && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "24px" }}>
            {markets.map((market) => (
              <MarketCard key={market.id} market={market} onRefresh={() => refetch()} />
            ))}
          </div>
        )}
      </section>

      {/* How It Works Section */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 16px", borderTop: "1px solid rgba(100, 160, 220, 0.2)", position: "relative", zIndex: 10 }}>
        <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: "white", textAlign: "center", marginBottom: "32px" }}>
          How It Works
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "32px" }}>
          {[
            { step: "1", title: "Choose a Resort", desc: "Pick from Mammoth, Palisades Tahoe, Jackson Hole, Snowbird, or Aspen" },
            { step: "2", title: "Buy Shares", desc: "Buy YES if you think it will snow the target amount, NO if you don't" },
            { step: "3", title: "Claim Winnings", desc: "When the market resolves, winners split the total pool proportionally" },
          ].map((item) => (
            <div key={item.step} style={{ textAlign: "center" }}>
              <div style={{
                width: "64px",
                height: "64px",
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: "1.5rem",
                fontWeight: "700",
              }}>
                {item.step}
              </div>
              <h4 style={{ fontSize: "1.125rem", fontWeight: "600", color: "white", marginBottom: "8px" }}>{item.title}</h4>
              <p style={{ color: "#94a3b8" }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(100, 160, 220, 0.2)", padding: "32px 16px", textAlign: "center", position: "relative", zIndex: 10 }}>
        <p style={{ color: "#64748b" }}>PowGuess - Built on Monad Testnet</p>
        <p style={{ color: "#475569", fontSize: "0.875rem", marginTop: "8px" }}>
          Weather data powered by OpenWeather | x402 micropayments enabled
        </p>
      </footer>
    </main>
  );
}

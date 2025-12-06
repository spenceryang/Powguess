"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import MarketCard from "@/components/MarketCard";
import Leaderboard from "@/components/Leaderboard";
import FriendsCircle from "@/components/FriendsCircle";
import { fetchMarkets, type Market } from "@/lib/api";
import { useBeerMode } from "@/lib/BeerModeContext";

type TabType = "active" | "resolved" | "leaderboard" | "friends";

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
  const [activeTab, setActiveTab] = useState<TabType>("active");

  // Filter markets by status
  const activeMarkets = markets?.filter(m => m.status === "Active") || [];
  const resolvedMarkets = markets?.filter(m => m.status === "Resolved") || [];

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

      {/* Tabs Section */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 16px 48px", position: "relative", zIndex: 10 }}>
        {/* Tab Navigation */}
        <div style={{
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
          borderBottom: "1px solid rgba(100, 160, 220, 0.2)",
          paddingBottom: "16px",
        }}>
          <button
            onClick={() => setActiveTab("active")}
            style={{
              padding: "12px 24px",
              borderRadius: "12px 12px 0 0",
              border: "none",
              background: activeTab === "active"
                ? "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)"
                : "rgba(15, 30, 55, 0.8)",
              color: activeTab === "active" ? "white" : "#94a3b8",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s",
            }}
          >
            <span>🎿</span>
            Active Markets
            {activeMarkets.length > 0 && (
              <span style={{
                background: activeTab === "active" ? "rgba(255,255,255,0.2)" : "rgba(59, 130, 246, 0.3)",
                padding: "2px 8px",
                borderRadius: "10px",
                fontSize: "0.75rem",
              }}>
                {activeMarkets.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("resolved")}
            style={{
              padding: "12px 24px",
              borderRadius: "12px 12px 0 0",
              border: "none",
              background: activeTab === "resolved"
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : "rgba(15, 30, 55, 0.8)",
              color: activeTab === "resolved" ? "white" : "#94a3b8",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s",
            }}
          >
            <span>🏆</span>
            Resolved
            {resolvedMarkets.length > 0 && (
              <span style={{
                background: activeTab === "resolved" ? "rgba(255,255,255,0.2)" : "rgba(16, 185, 129, 0.3)",
                padding: "2px 8px",
                borderRadius: "10px",
                fontSize: "0.75rem",
              }}>
                {resolvedMarkets.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("leaderboard")}
            style={{
              padding: "12px 24px",
              borderRadius: "12px 12px 0 0",
              border: "none",
              background: activeTab === "leaderboard"
                ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                : "rgba(15, 30, 55, 0.8)",
              color: activeTab === "leaderboard" ? "white" : "#94a3b8",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s",
            }}
          >
            <span>🍺</span>
            Beer Leaderboard
          </button>

          <button
            onClick={() => setActiveTab("friends")}
            style={{
              padding: "12px 24px",
              borderRadius: "12px 12px 0 0",
              border: "none",
              background: activeTab === "friends"
                ? "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)"
                : "rgba(15, 30, 55, 0.8)",
              color: activeTab === "friends" ? "white" : "#94a3b8",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s",
            }}
          >
            <span>👥</span>
            My Circle
          </button>

          {/* Refresh button */}
          {activeTab !== "leaderboard" && activeTab !== "friends" && (
            <button
              onClick={() => refetch()}
              style={{
                marginLeft: "auto",
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                background: "rgba(15, 30, 55, 0.8)",
                color: "#38bdf8",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.875rem",
              }}
            >
              <span>🔄</span> Refresh
            </button>
          )}
        </div>

        {/* Tab Content */}
        {isLoading && activeTab !== "leaderboard" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "24px" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="glass-card" style={{ height: "400px", animation: "pulse 2s infinite" }} />
            ))}
          </div>
        )}

        {error && activeTab !== "leaderboard" && (
          <div className="glass-card" style={{ padding: "48px", textAlign: "center", borderColor: "rgba(239, 68, 68, 0.3)" }}>
            <p style={{ color: "#f87171", marginBottom: "16px" }}>Failed to load markets. Make sure the backend is running.</p>
            <button onClick={() => refetch()} className="btn-no">
              Try Again
            </button>
          </div>
        )}

        {/* Active Markets Tab */}
        {activeTab === "active" && markets && (
          <>
            {activeMarkets.length === 0 ? (
              <div className="glass-card" style={{ padding: "48px", textAlign: "center" }}>
                <span style={{ fontSize: "3rem", display: "block", marginBottom: "16px" }}>🎿</span>
                <p style={{ color: "#94a3b8", marginBottom: "8px" }}>No active markets right now</p>
                <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Check back later for new snowfall predictions!</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "24px" }}>
                {activeMarkets.map((market) => (
                  <MarketCard key={market.id} market={market} onRefresh={() => refetch()} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Resolved Markets Tab */}
        {activeTab === "resolved" && markets && (
          <>
            {resolvedMarkets.length === 0 ? (
              <div className="glass-card" style={{ padding: "48px", textAlign: "center" }}>
                <span style={{ fontSize: "3rem", display: "block", marginBottom: "16px" }}>🏆</span>
                <p style={{ color: "#94a3b8", marginBottom: "8px" }}>No resolved markets yet</p>
                <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Markets will appear here after they&apos;re settled</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "24px" }}>
                {resolvedMarkets.map((market) => (
                  <MarketCard key={market.id} market={market} onRefresh={() => refetch()} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Leaderboard Tab */}
        {activeTab === "leaderboard" && (
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <Leaderboard />
          </div>
        )}

        {/* Friends Circle Tab */}
        {activeTab === "friends" && (
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <FriendsCircle />
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

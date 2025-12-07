"use client";

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { fetchLeaderboard, LeaderboardEntry, LeaderboardStats } from "@/lib/api";

export default function Leaderboard() {
  const account = useActiveAccount();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [globalStats, setGlobalStats] = useState<LeaderboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const data = await fetchLeaderboard();
        setLeaderboard(data.leaderboard);
        setGlobalStats(data.globalStats);
        setLastUpdated(data.lastUpdated);
      } catch (error) {
        console.error("Failed to load leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };
    loadLeaderboard();

    // Refresh every 30 seconds
    const interval = setInterval(loadLeaderboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return "🥇";
      case 2: return "🥈";
      case 3: return "🥉";
      default: return `#${rank}`;
    }
  };

  const getResortEmoji = (resort: string) => {
    const emojis: { [key: string]: string } = {
      "Mammoth Mountain": "🦣",
      "Palisades Tahoe": "🏔️",
      "Jackson Hole": "🦬",
      "Snowbird": "🐦",
      "Aspen": "🌲",
    };
    return emojis[resort] || "⛷️";
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isCurrentUser = (address: string) => {
    return account?.address?.toLowerCase() === address.toLowerCase();
  };

  if (loading) {
    return (
      <div className="glass-card" style={{ padding: "24px", textAlign: "center" }}>
        <p style={{ color: "#94a3b8" }}>Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ overflow: "hidden" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        padding: "20px 24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "2rem" }}>🍺</span>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "white", margin: 0 }}>
              Beer Leaderboard
            </h2>
            <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.8)", margin: 0 }}>
              Top powder predictors & beer enthusiasts
            </p>
          </div>
        </div>
      </div>

      {/* Global Stats */}
      {globalStats && (
        <div className="mobile-leaderboard-stats" style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          padding: "16px 24px",
          background: "rgba(251, 191, 36, 0.1)",
          borderBottom: "1px solid rgba(251, 191, 36, 0.2)",
        }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "1.5rem", fontWeight: "700", color: "#fbbf24", margin: 0 }}>
              {globalStats.totalBeers}
            </p>
            <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: 0 }}>Total Beers</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "1.5rem", fontWeight: "700", color: "#10b981", margin: 0 }}>
              {globalStats.totalRedeemed}
            </p>
            <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: 0 }}>Redeemed</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "1.5rem", fontWeight: "700", color: "#38bdf8", margin: 0 }}>
              {globalStats.totalPending}
            </p>
            <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: 0 }}>Pending</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "1.5rem", fontWeight: "700", color: "#a78bfa", margin: 0 }}>
              {globalStats.totalUsers}
            </p>
            <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: 0 }}>Skiers</p>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div style={{ padding: "16px 24px" }}>
        {leaderboard.length === 0 ? (
          <p style={{ color: "#64748b", textAlign: "center", padding: "20px" }}>
            No beer purchases yet. Be the first to buy a beer!
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {leaderboard.map((entry) => (
              <div
                key={entry.address}
                className="mobile-leaderboard-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "50px 1fr 80px 80px 100px",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  background: isCurrentUser(entry.address)
                    ? "rgba(251, 191, 36, 0.15)"
                    : entry.rank <= 3
                      ? "rgba(251, 191, 36, 0.08)"
                      : "rgba(15, 30, 55, 0.5)",
                  borderRadius: "12px",
                  border: isCurrentUser(entry.address)
                    ? "2px solid #fbbf24"
                    : entry.rank <= 3
                      ? "1px solid rgba(251, 191, 36, 0.3)"
                      : "1px solid rgba(100, 160, 220, 0.1)",
                }}
              >
                {/* Rank */}
                <div style={{
                  fontSize: entry.rank <= 3 ? "1.5rem" : "1rem",
                  fontWeight: "700",
                  color: entry.rank <= 3 ? "#fbbf24" : "#64748b",
                  textAlign: "center",
                }}>
                  {getRankEmoji(entry.rank)}
                </div>

                {/* User Info */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: "700", color: "white", fontSize: "0.95rem" }}>
                      {entry.nickname}
                    </span>
                    {isCurrentUser(entry.address) && (
                      <span style={{
                        fontSize: "0.65rem",
                        background: "#fbbf24",
                        color: "#1f2937",
                        padding: "2px 6px",
                        borderRadius: "10px",
                        fontWeight: "600",
                      }}>
                        YOU
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                    <span style={{ color: "#64748b", fontSize: "0.7rem", fontFamily: "monospace" }}>
                      {shortenAddress(entry.address)}
                    </span>
                    <span style={{ color: "#475569", fontSize: "0.7rem" }}>•</span>
                    <span style={{ fontSize: "0.7rem" }}>
                      {getResortEmoji(entry.favoriteResort)} {entry.favoriteResort}
                    </span>
                  </div>
                </div>

                {/* Total Beers */}
                <div style={{ textAlign: "center" }}>
                  <p style={{
                    fontSize: "1.25rem",
                    fontWeight: "700",
                    color: "#fbbf24",
                    margin: 0,
                  }}>
                    {entry.totalBeers}
                  </p>
                  <p style={{ fontSize: "0.65rem", color: "#64748b", margin: 0 }}>beers</p>
                </div>

                {/* Redeemed */}
                <div className="hide-on-mobile" style={{ textAlign: "center" }}>
                  <p style={{
                    fontSize: "1rem",
                    fontWeight: "600",
                    color: "#10b981",
                    margin: 0,
                  }}>
                    {entry.redeemedBeers}
                  </p>
                  <p style={{ fontSize: "0.65rem", color: "#64748b", margin: 0 }}>redeemed</p>
                </div>

                {/* Total Spent */}
                <div className="hide-on-mobile" style={{ textAlign: "right" }}>
                  <p style={{
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    color: "#a78bfa",
                    margin: 0,
                  }}>
                    ${entry.totalSpent}
                  </p>
                  <p style={{ fontSize: "0.65rem", color: "#64748b", margin: 0 }}>spent</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: "16px",
          paddingTop: "12px",
          borderTop: "1px solid rgba(100, 160, 220, 0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <p style={{ color: "#475569", fontSize: "0.7rem", margin: 0 }}>
            Updated: {new Date(lastUpdated).toLocaleTimeString()}
          </p>
          <p style={{ color: "#fbbf24", fontSize: "0.7rem", margin: 0 }}>
            Powered by x402
          </p>
        </div>
      </div>
    </div>
  );
}

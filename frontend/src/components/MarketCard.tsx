"use client";

import { useState, useEffect } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client, monadTestnet, SNOW_MARKET_ADDRESS, MOCK_USDC_ADDRESS } from "@/lib/thirdweb";
import type { Market, ForecastData } from "@/lib/api";
import { fetchForecast } from "@/lib/api";
import { useBeerMode } from "@/lib/BeerModeContext";

interface MarketCardProps {
  market: Market;
  onRefresh?: () => void;
}

export default function MarketCard({ market, onRefresh }: MarketCardProps) {
  const account = useActiveAccount();
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  const [shareAmount, setShareAmount] = useState(1);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyType, setBuyType] = useState<"yes" | "no">("yes");
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [showForecast, setShowForecast] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const { beerMode, toBeer } = useBeerMode();

  const isExpired = market.resolutionTime * 1000 < Date.now();
  const timeLeft = market.resolutionTime * 1000 - Date.now();
  const daysLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60 * 24)));

  // Price constants
  const SHARE_PRICE = 0.5;
  const shareTotal = shareAmount * SHARE_PRICE;
  const poolValue = parseFloat(market.totalPool);

  useEffect(() => {
    const loadForecast = async () => {
      setLoadingForecast(true);
      try {
        const data = await fetchForecast(market.resortName);
        setForecast(data);
      } catch (error) {
        console.error("Failed to load forecast:", error);
      } finally {
        setLoadingForecast(false);
      }
    };
    loadForecast();
  }, [market.resortName]);

  const handleBuy = async (isYes: boolean) => {
    if (!account) {
      alert("Please connect your wallet first");
      return;
    }

    if (!SNOW_MARKET_ADDRESS || !MOCK_USDC_ADDRESS) {
      alert("Contract addresses not configured. Check your .env.local file.");
      return;
    }

    if (shareAmount < 1) {
      alert("Please enter at least 1 share");
      return;
    }

    try {
      const usdcContract = getContract({
        client,
        chain: monadTestnet,
        address: MOCK_USDC_ADDRESS,
      });

      // 0.5 USDC per share = 500000 (6 decimals)
      const approveAmount = BigInt(shareAmount) * BigInt(500000);

      console.log("Approving USDC:", {
        amount: approveAmount.toString(),
        spender: SNOW_MARKET_ADDRESS,
        shares: shareAmount,
      });

      const approveTx = prepareContractCall({
        contract: usdcContract,
        method: "function approve(address spender, uint256 amount) returns (bool)",
        params: [SNOW_MARKET_ADDRESS, approveAmount],
      });

      sendTransaction(approveTx, {
        onSuccess: async () => {
          console.log("USDC approved, now buying shares...");

          const marketContract = getContract({
            client,
            chain: monadTestnet,
            address: SNOW_MARKET_ADDRESS,
          });

          const buyTx = prepareContractCall({
            contract: marketContract,
            method: "function buyShares(uint256 marketId, bool isYes, uint256 shareAmount)",
            params: [BigInt(market.id), isYes, BigInt(shareAmount)],
          });

          sendTransaction(buyTx, {
            onSuccess: () => {
              console.log("Shares purchased successfully!");
              setShowBuyModal(false);
              setShareAmount(1);
              onRefresh?.();
            },
            onError: (error) => {
              console.error("Buy transaction failed:", error);
              alert(`Failed to buy shares: ${error.message || "Unknown error"}`);
            },
          });
        },
        onError: (error) => {
          console.error("Approval failed:", error);
          alert(`Failed to approve USDC: ${error.message || "Unknown error"}`);
        },
      });
    } catch (error) {
      console.error("Transaction setup failed:", error);
      alert(`Transaction failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleClaim = async () => {
    if (!account) {
      alert("Please connect your wallet first");
      return;
    }

    if (!SNOW_MARKET_ADDRESS) {
      alert("Contract address not configured");
      return;
    }

    try {
      const marketContract = getContract({
        client,
        chain: monadTestnet,
        address: SNOW_MARKET_ADDRESS,
      });

      console.log("Claiming winnings for market:", market.id);

      const claimTx = prepareContractCall({
        contract: marketContract,
        method: "function claimWinnings(uint256 marketId)",
        params: [BigInt(market.id)],
      });

      sendTransaction(claimTx, {
        onSuccess: () => {
          console.log("Winnings claimed successfully!");
          alert("Winnings claimed successfully!");
          onRefresh?.();
        },
        onError: (error) => {
          console.error("Claim failed:", error);
          alert(`Failed to claim: ${error.message || "Unknown error"}`);
        },
      });
    } catch (error) {
      console.error("Claim setup failed:", error);
      alert(`Claim failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const resortEmojis: { [key: string]: string } = {
    "Mammoth Mountain": "🦣",
    "Palisades Tahoe": "🏔️",
    "Jackson Hole": "🦬",
    "Snowbird": "🐦",
    "Aspen": "🌲",
  };

  const resortGradients: { [key: string]: string } = {
    "Mammoth Mountain": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "Palisades Tahoe": "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    "Jackson Hole": "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)",
    "Snowbird": "linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)",
    "Aspen": "linear-gradient(135deg, #834d9b 0%, #d04ed6 100%)",
  };

  return (
    <>
      <div className="glass-card" style={{ overflow: "hidden", transition: "all 0.3s" }}>
        {/* Header */}
        <div style={{
          background: resortGradients[market.resortName] || "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
          padding: "20px 24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "2rem" }}>{resortEmojis[market.resortName] || "⛷️"}</span>
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "white", margin: 0 }}>{market.resortName}</h3>
              <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.8)", margin: 0 }}>
                Target: {market.targetSnowfall}" of snow
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          <p style={{ color: "#94a3b8", marginBottom: "20px", fontSize: "0.9rem" }}>{market.description}</p>

          {/* Odds Display */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
            <div style={{
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "12px",
              padding: "16px",
              textAlign: "center",
            }}>
              <p style={{ color: "#10b981", fontSize: "0.75rem", fontWeight: "600", margin: "0 0 4px 0" }}>YES</p>
              <p style={{ color: "white", fontSize: "1.75rem", fontWeight: "700", margin: "0 0 4px 0" }}>{market.yesOdds}%</p>
              <p style={{ color: "#64748b", fontSize: "0.7rem", margin: 0 }}>{market.totalYesShares} shares</p>
            </div>
            <div style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "12px",
              padding: "16px",
              textAlign: "center",
            }}>
              <p style={{ color: "#ef4444", fontSize: "0.75rem", fontWeight: "600", margin: "0 0 4px 0" }}>NO</p>
              <p style={{ color: "white", fontSize: "1.75rem", fontWeight: "700", margin: "0 0 4px 0" }}>{market.noOdds}%</p>
              <p style={{ color: "#64748b", fontSize: "0.7rem", margin: 0 }}>{market.totalNoShares} shares</p>
            </div>
          </div>

          {/* Info Row */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", fontSize: "0.875rem" }}>
            <span style={{ color: "#64748b" }}>Total Pool</span>
            <span style={{ color: beerMode ? "#fbbf24" : "#38bdf8", fontWeight: "600" }}>
              {beerMode ? (
                <>{toBeer(poolValue)} 🍺</>
              ) : (
                <>${market.totalPool} USDC</>
              )}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", fontSize: "0.875rem" }}>
            <span style={{ color: "#64748b" }}>Time Left</span>
            {isExpired ? (
              <span style={{ color: "#ef4444", fontWeight: "600" }}>Expired</span>
            ) : (
              <span style={{ color: "#a78bfa", fontWeight: "600" }}>{daysLeft} days</span>
            )}
          </div>

          {/* Status */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <span style={{
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "0.75rem",
              fontWeight: "600",
              background: market.status === "Active" ? "rgba(16, 185, 129, 0.1)" : "rgba(100, 116, 139, 0.1)",
              color: market.status === "Active" ? "#10b981" : "#64748b",
              border: `1px solid ${market.status === "Active" ? "rgba(16, 185, 129, 0.3)" : "rgba(100, 116, 139, 0.3)"}`,
            }}>
              {market.status}
            </span>
            {market.outcome !== "Undecided" && (
              <span style={{
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: "600",
                background: market.outcome === "Yes" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                color: market.outcome === "Yes" ? "#10b981" : "#ef4444",
              }}>
                Outcome: {market.outcome}
              </span>
            )}
          </div>

          {/* Weather & Forecast Toggle */}
          <button
            onClick={() => setShowForecast(!showForecast)}
            style={{
              width: "100%",
              background: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "12px",
              padding: "12px 16px",
              color: "#38bdf8",
              fontWeight: "600",
              cursor: "pointer",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>❄️</span>
              {loadingForecast ? "Loading forecast..." : "Weather & Webcams"}
            </span>
            <span style={{ transform: showForecast ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▼</span>
          </button>

          {/* Forecast Section */}
          {showForecast && forecast && (
            <div style={{
              background: "rgba(15, 30, 55, 0.9)",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "20px",
              border: "1px solid rgba(56, 189, 248, 0.2)",
            }}>
              {/* Current Conditions */}
              <div style={{ marginBottom: "16px" }}>
                <h4 style={{ color: "#38bdf8", fontSize: "0.8rem", fontWeight: "600", marginBottom: "10px", textTransform: "uppercase" }}>
                  Current Conditions
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ textAlign: "center", background: "rgba(56, 189, 248, 0.1)", borderRadius: "8px", padding: "10px" }}>
                    <p style={{ fontSize: "1.5rem", fontWeight: "700", color: "white", margin: 0 }}>{forecast.current.temp}°F</p>
                    <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: 0 }}>Temperature</p>
                  </div>
                  <div style={{ textAlign: "center", background: "rgba(56, 189, 248, 0.1)", borderRadius: "8px", padding: "10px" }}>
                    <p style={{ fontSize: "0.9rem", fontWeight: "600", color: "white", margin: 0 }}>{forecast.current.conditions}</p>
                    <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: 0 }}>Conditions</p>
                  </div>
                </div>
              </div>

              {/* Snow Forecast */}
              <div style={{ marginBottom: "16px" }}>
                <h4 style={{ color: "#a78bfa", fontSize: "0.8rem", fontWeight: "600", marginBottom: "10px", textTransform: "uppercase" }}>
                  Snow Forecast
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  <div style={{ textAlign: "center", background: "rgba(167, 139, 250, 0.1)", borderRadius: "8px", padding: "10px" }}>
                    <p style={{ fontSize: "1.25rem", fontWeight: "700", color: "#a78bfa", margin: 0 }}>{forecast.forecast.snow24h}"</p>
                    <p style={{ fontSize: "0.65rem", color: "#94a3b8", margin: 0 }}>24 Hours</p>
                  </div>
                  <div style={{ textAlign: "center", background: "rgba(167, 139, 250, 0.1)", borderRadius: "8px", padding: "10px" }}>
                    <p style={{ fontSize: "1.25rem", fontWeight: "700", color: "#a78bfa", margin: 0 }}>{forecast.forecast.snow48h}"</p>
                    <p style={{ fontSize: "0.65rem", color: "#94a3b8", margin: 0 }}>48 Hours</p>
                  </div>
                  <div style={{ textAlign: "center", background: "rgba(167, 139, 250, 0.15)", borderRadius: "8px", padding: "10px" }}>
                    <p style={{ fontSize: "1.25rem", fontWeight: "700", color: "#c084fc", margin: 0 }}>{forecast.forecast.snow7d || forecast.forecast.snow5d}"</p>
                    <p style={{ fontSize: "0.65rem", color: "#94a3b8", margin: 0 }}>5-7 Days</p>
                  </div>
                </div>
                <p style={{
                  textAlign: "center",
                  marginTop: "10px",
                  padding: "6px 12px",
                  background: forecast.forecast.trend.includes("Heavy")
                    ? "rgba(16, 185, 129, 0.15)"
                    : forecast.forecast.trend.includes("Moderate")
                      ? "rgba(251, 191, 36, 0.15)"
                      : "rgba(100, 116, 139, 0.15)",
                  borderRadius: "20px",
                  color: forecast.forecast.trend.includes("Heavy")
                    ? "#10b981"
                    : forecast.forecast.trend.includes("Moderate")
                      ? "#fbbf24"
                      : "#94a3b8",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                }}>
                  {forecast.forecast.trend}
                </p>
              </div>

              {/* Webcams */}
              <div>
                <h4 style={{ color: "#4ade80", fontSize: "0.8rem", fontWeight: "600", marginBottom: "10px", textTransform: "uppercase" }}>
                  Live Webcams
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {forecast.webcams.map((cam, idx) => (
                    <a
                      key={idx}
                      href={cam.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        background: "rgba(74, 222, 128, 0.1)",
                        border: "1px solid rgba(74, 222, 128, 0.3)",
                        borderRadius: "20px",
                        color: "#4ade80",
                        textDecoration: "none",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                        transition: "all 0.2s",
                      }}
                    >
                      <span>📹</span> {cam.name}
                    </a>
                  ))}
                </div>
                <a
                  href={forecast.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    marginTop: "12px",
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: "0.7rem",
                    textDecoration: "none",
                  }}
                >
                  Visit {market.resortName} Website →
                </a>
              </div>

              <p style={{ textAlign: "center", color: "#475569", fontSize: "0.65rem", marginTop: "12px" }}>
                Last updated: {new Date(forecast.lastUpdated).toLocaleTimeString()} • Source: {forecast.source}
              </p>
            </div>
          )}

          {/* Buy Buttons */}
          {market.status === "Active" && !isExpired && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button
                onClick={() => { setBuyType("yes"); setShowBuyModal(true); }}
                className="btn-yes"
              >
                Buy YES @ {beerMode ? `${toBeer(SHARE_PRICE)} 🍺` : "$0.50"}
              </button>
              <button
                onClick={() => { setBuyType("no"); setShowBuyModal(true); }}
                className="btn-no"
              >
                Buy NO @ {beerMode ? `${toBeer(SHARE_PRICE)} 🍺` : "$0.50"}
              </button>
            </div>
          )}

          {/* Claim Winnings Button - Shows for resolved markets */}
          {market.status === "Resolved" && market.outcome !== "Undecided" && (
            <div style={{ marginTop: "12px" }}>
              <button
                onClick={handleClaim}
                disabled={isPending || !account}
                style={{
                  width: "100%",
                  background: market.outcome === "Yes"
                    ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
                    : "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
                  color: "white",
                  fontWeight: "700",
                  padding: "14px 24px",
                  borderRadius: "12px",
                  border: "none",
                  cursor: isPending || !account ? "not-allowed" : "pointer",
                  opacity: isPending || !account ? 0.5 : 1,
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>🏆</span>
                {isPending ? "Claiming..." : !account ? "Connect Wallet to Claim" : "Claim Winnings"}
              </button>
              <p style={{
                textAlign: "center",
                color: "#64748b",
                fontSize: "0.75rem",
                marginTop: "8px",
              }}>
                {market.outcome === "Yes" ? "YES" : "NO"} wins! Claim your share of the pool.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Buy Modal */}
      {showBuyModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "16px",
        }}>
          <div className="glass-card" style={{ maxWidth: "400px", width: "100%", padding: "24px" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "white", marginBottom: "8px" }}>
              Buy {buyType.toUpperCase()} Shares
            </h3>
            <p style={{ color: "#64748b", marginBottom: "20px" }}>{market.resortName}</p>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "0.875rem", color: "#94a3b8", marginBottom: "8px" }}>
                Number of Shares
              </label>
              <input
                type="number"
                min="1"
                value={shareAmount || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "") {
                    setShareAmount(0);
                  } else {
                    setShareAmount(Math.max(1, parseInt(val) || 1));
                  }
                }}
                onBlur={() => {
                  if (shareAmount < 1) setShareAmount(1);
                }}
                style={{
                  width: "100%",
                  background: "rgba(15, 30, 55, 0.8)",
                  border: "1px solid rgba(100, 160, 220, 0.3)",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  color: "white",
                  fontSize: "1rem",
                }}
              />
            </div>

            <div style={{
              background: "rgba(15, 30, 55, 0.8)",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "24px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "#94a3b8" }}>Price per share</span>
                <span style={{ color: beerMode ? "#fbbf24" : "white" }}>
                  {beerMode ? `${toBeer(SHARE_PRICE)} 🍺` : "$0.50 USDC"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Total cost</span>
                <span style={{ color: beerMode ? "#fbbf24" : "#38bdf8", fontWeight: "700" }}>
                  {beerMode ? `${toBeer(shareTotal)} 🍺` : `$${shareTotal.toFixed(2)} USDC`}
                </span>
              </div>
              {beerMode && (
                <p style={{ color: "#64748b", fontSize: "0.7rem", textAlign: "center", marginTop: "8px", marginBottom: 0 }}>
                  (Based on $9 lodge beer price)
                </p>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button
                onClick={() => setShowBuyModal(false)}
                style={{
                  background: "rgba(100, 116, 139, 0.2)",
                  border: "1px solid rgba(100, 116, 139, 0.3)",
                  color: "white",
                  fontWeight: "600",
                  padding: "12px",
                  borderRadius: "12px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleBuy(buyType === "yes")}
                disabled={isPending || !account}
                className={buyType === "yes" ? "btn-yes" : "btn-no"}
                style={{ opacity: isPending || !account ? 0.5 : 1 }}
              >
                {isPending ? "Processing..." : !account ? "Connect Wallet" : `Confirm`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

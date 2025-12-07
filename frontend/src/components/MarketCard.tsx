"use client";

import { useState, useEffect } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client, monadTestnet, SNOW_MARKET_ADDRESS, MOCK_USDC_ADDRESS } from "@/lib/thirdweb";
import type { Market, ForecastData, BeerVoucher, FriendPosition } from "@/lib/api";
import { fetchForecast, buyBeer, fetchFriendPositions } from "@/lib/api";
import { useBeerMode } from "@/lib/BeerModeContext";
import { useToast } from "@/components/Toast";

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
  const toast = useToast();

  // Beer purchase state
  const [showBeerModal, setShowBeerModal] = useState(false);
  const [beerAmount, setBeerAmount] = useState(1);
  const [buyingBeer, setBuyingBeer] = useState(false);
  const [purchasedVoucher, setPurchasedVoucher] = useState<BeerVoucher | null>(null);
  const BEER_PRICE = 9; // $9 per lodge beer

  // Friends positions state
  const [showFriends, setShowFriends] = useState(false);
  const [friendPositions, setFriendPositions] = useState<FriendPosition[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friendsWithPositions, setFriendsWithPositions] = useState(0);

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

  // Load friend positions when account is connected
  useEffect(() => {
    const loadFriendPositions = async () => {
      if (!account?.address) return;
      setLoadingFriends(true);
      try {
        const data = await fetchFriendPositions(account.address, market.id);
        setFriendPositions(data.friendPositions);
        setFriendsWithPositions(data.summary.friendsWithPositions);
      } catch (error) {
        console.error("Failed to load friend positions:", error);
      } finally {
        setLoadingFriends(false);
      }
    };
    loadFriendPositions();
  }, [account?.address, market.id]);

  const handleBuy = async (isYes: boolean) => {
    if (!account) {
      toast.warning("Wallet Required", "Please connect your wallet first");
      return;
    }

    if (!SNOW_MARKET_ADDRESS || !MOCK_USDC_ADDRESS) {
      toast.error("Configuration Error", "Contract addresses not configured. Check your .env.local file.");
      return;
    }

    if (shareAmount < 1) {
      toast.warning("Invalid Amount", "Please enter at least 1 share");
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
          console.log("USDC approved, waiting before buying shares...");

          // Wait 2 seconds to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));

          console.log("Now buying shares...");
          console.log("Buying shares:", {
            marketId: market.id,
            resortName: market.resortName,
            isYes: isYes,
            shareAmount: shareAmount,
            marketStatus: market.status,
          });

          const marketContract = getContract({
            client,
            chain: monadTestnet,
            address: SNOW_MARKET_ADDRESS,
          });

          const buyTx = prepareContractCall({
            contract: marketContract,
            method: "function buyShares(uint256 marketId, bool isYes, uint256 shareAmount)",
            params: [BigInt(market.id), isYes, BigInt(shareAmount)],
            gas: BigInt(300000), // Explicit gas limit
          });

          console.log("Prepared buyTx:", buyTx);

          sendTransaction(buyTx, {
            onSuccess: () => {
              console.log("Shares purchased successfully!");
              toast.success(
                "Shares Purchased!",
                `Successfully bought ${shareAmount} ${buyType.toUpperCase()} share${shareAmount > 1 ? "s" : ""} for ${market.resortName}`
              );
              setShowBuyModal(false);
              setShareAmount(1);
              onRefresh?.();
            },
            onError: (error) => {
              console.error("Buy transaction failed:", error);
              toast.error("Transaction Failed", error.message || "Failed to buy shares");
            },
          });
        },
        onError: (error) => {
          console.error("Approval failed:", error);
          toast.error("Approval Failed", error.message || "Failed to approve USDC");
        },
      });
    } catch (error) {
      console.error("Transaction setup failed:", error);
      toast.error("Transaction Error", error instanceof Error ? error.message : "Unknown error");
    }
  };

  const handleClaim = async () => {
    if (!account) {
      toast.warning("Wallet Required", "Please connect your wallet first");
      return;
    }

    if (!SNOW_MARKET_ADDRESS) {
      toast.error("Configuration Error", "Contract address not configured");
      return;
    }

    try {
      const marketContract = getContract({
        client,
        chain: monadTestnet,
        address: SNOW_MARKET_ADDRESS,
      });

      console.log("Claiming winnings for market:", market.id);
      toast.info("Processing Claim", "Submitting transaction to claim your winnings...");

      const claimTx = prepareContractCall({
        contract: marketContract,
        method: "function claimWinnings(uint256 marketId)",
        params: [BigInt(market.id)],
      });

      sendTransaction(claimTx, {
        onSuccess: () => {
          console.log("Winnings claimed successfully!");
          toast.success(
            "Winnings Claimed!",
            `Congratulations! Your winnings from ${market.resortName} have been claimed.`
          );
          onRefresh?.();
        },
        onError: (error) => {
          console.error("Claim failed:", error);
          toast.error("Claim Failed", error.message || "Failed to claim winnings");
        },
      });
    } catch (error) {
      console.error("Claim setup failed:", error);
      toast.error("Claim Error", error instanceof Error ? error.message : "Unknown error");
    }
  };

  // Handle beer purchase via x402
  const handleBuyBeer = async () => {
    if (!account) {
      toast.warning("Wallet Required", "Please connect your wallet first");
      return;
    }

    setBuyingBeer(true);
    toast.info("Processing Purchase", "Buying your lodge beer via x402...");

    try {
      const result = await buyBeer(account.address, market.resortName, beerAmount);
      setPurchasedVoucher(result.voucher);
      setShowBeerModal(false);
      setBeerAmount(1);
      toast.success(
        `${beerAmount} Beer${beerAmount > 1 ? "s" : ""} Purchased!`,
        `Your redemption code: ${result.voucher.redemptionCode}`
      );
    } catch (error) {
      console.error("Beer purchase failed:", error);
      toast.error("Purchase Failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setBuyingBeer(false);
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

          {/* Friends Positions Toggle */}
          {account && friendPositions.length > 0 && (
            <>
              <button
                onClick={() => setShowFriends(!showFriends)}
                style={{
                  width: "100%",
                  background: friendsWithPositions > 0 ? "rgba(167, 139, 250, 0.15)" : "rgba(100, 116, 139, 0.1)",
                  border: friendsWithPositions > 0 ? "1px solid rgba(167, 139, 250, 0.3)" : "1px solid rgba(100, 116, 139, 0.3)",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  color: friendsWithPositions > 0 ? "#a78bfa" : "#64748b",
                  fontWeight: "600",
                  cursor: "pointer",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>👥</span>
                  {loadingFriends ? "Loading friends..." : `Friends' Predictions`}
                  {friendsWithPositions > 0 && (
                    <span style={{
                      background: "rgba(167, 139, 250, 0.3)",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "0.75rem",
                    }}>
                      {friendsWithPositions} active
                    </span>
                  )}
                </span>
                <span style={{ transform: showFriends ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▼</span>
              </button>

              {/* Friends Positions Section */}
              {showFriends && (
                <div style={{
                  background: "rgba(15, 30, 55, 0.9)",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "20px",
                  border: "1px solid rgba(167, 139, 250, 0.2)",
                }}>
                  <h4 style={{ color: "#a78bfa", fontSize: "0.8rem", fontWeight: "600", marginBottom: "12px", textTransform: "uppercase" }}>
                    Your Circle&apos;s Positions
                  </h4>

                  {friendPositions.filter(f => f.hasPosition).length === 0 ? (
                    <p style={{ color: "#64748b", fontSize: "0.85rem", textAlign: "center", padding: "12px 0" }}>
                      None of your friends have positions in this market yet
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {friendPositions.filter(f => f.hasPosition).map((friend) => (
                        <div
                          key={friend.address}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 12px",
                            background: friend.netPosition > 0
                              ? "rgba(16, 185, 129, 0.1)"
                              : friend.netPosition < 0
                                ? "rgba(239, 68, 68, 0.1)"
                                : "rgba(100, 116, 139, 0.1)",
                            borderRadius: "8px",
                            border: `1px solid ${
                              friend.netPosition > 0
                                ? "rgba(16, 185, 129, 0.3)"
                                : friend.netPosition < 0
                                  ? "rgba(239, 68, 68, 0.3)"
                                  : "rgba(100, 116, 139, 0.3)"
                            }`,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                background: friend.netPosition > 0
                                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                                  : friend.netPosition < 0
                                    ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                                    : "linear-gradient(135deg, #64748b 0%, #475569 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.85rem",
                                fontWeight: "700",
                                color: "white",
                              }}
                            >
                              {friend.label.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p style={{ color: "white", fontWeight: "600", fontSize: "0.85rem", margin: 0 }}>
                                {friend.label.split(" ")[0]}
                                {friend.nickname && (
                                  <span style={{ color: "#94a3b8", fontWeight: "400", marginLeft: "6px", fontSize: "0.75rem" }}>
                                    ({friend.nickname})
                                  </span>
                                )}
                              </p>
                              <p style={{ color: "#64748b", fontSize: "0.7rem", margin: 0 }}>
                                {friend.yesShares > 0 && <span style={{ color: "#10b981" }}>{friend.yesShares} YES</span>}
                                {friend.yesShares > 0 && friend.noShares > 0 && <span> • </span>}
                                {friend.noShares > 0 && <span style={{ color: "#ef4444" }}>{friend.noShares} NO</span>}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ textAlign: "right" }}>
                              <p style={{
                                color: friend.netPosition > 0 ? "#10b981" : friend.netPosition < 0 ? "#ef4444" : "#94a3b8",
                                fontWeight: "700",
                                fontSize: "0.95rem",
                                margin: 0,
                              }}>
                                {friend.netPosition > 0 ? "+" : ""}{friend.netPosition}
                              </p>
                              <p style={{ color: "#64748b", fontSize: "0.65rem", margin: 0 }}>
                                net position
                              </p>
                            </div>
                            {/* Copy Trade Button */}
                            {market.status === "Active" && !isExpired && friend.netPosition !== 0 && (
                              <button
                                onClick={() => {
                                  // Copy the friend's dominant position
                                  const isYesTrade = friend.netPosition > 0;
                                  const copyAmount = Math.abs(friend.netPosition);
                                  setBuyType(isYesTrade ? "yes" : "no");
                                  setShareAmount(copyAmount);
                                  setShowBuyModal(true);
                                }}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: "8px",
                                  border: "none",
                                  background: friend.netPosition > 0
                                    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                                    : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                                  color: "white",
                                  fontSize: "0.7rem",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  whiteSpace: "nowrap",
                                }}
                                title={`Copy ${friend.label.split(" ")[0]}'s ${friend.netPosition > 0 ? "YES" : "NO"} position`}
                              >
                                <span>📋</span> Copy
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary */}
                  {friendPositions.filter(f => f.hasPosition).length > 0 && (
                    <div style={{
                      marginTop: "12px",
                      padding: "10px",
                      background: "rgba(0, 0, 0, 0.2)",
                      borderRadius: "8px",
                    }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-around",
                        textAlign: "center",
                        marginBottom: market.status === "Active" && !isExpired ? "10px" : 0,
                      }}>
                        <div>
                          <p style={{ color: "#10b981", fontWeight: "700", fontSize: "1rem", margin: 0 }}>
                            {friendPositions.reduce((sum, f) => sum + f.yesShares, 0)}
                          </p>
                          <p style={{ color: "#64748b", fontSize: "0.65rem", margin: 0 }}>Total YES</p>
                        </div>
                        <div>
                          <p style={{ color: "#ef4444", fontWeight: "700", fontSize: "1rem", margin: 0 }}>
                            {friendPositions.reduce((sum, f) => sum + f.noShares, 0)}
                          </p>
                          <p style={{ color: "#64748b", fontSize: "0.65rem", margin: 0 }}>Total NO</p>
                        </div>
                        <div>
                          <p style={{
                            color: friendPositions.reduce((sum, f) => sum + f.netPosition, 0) > 0 ? "#10b981" : friendPositions.reduce((sum, f) => sum + f.netPosition, 0) < 0 ? "#ef4444" : "#94a3b8",
                            fontWeight: "700",
                            fontSize: "1rem",
                            margin: 0,
                          }}>
                            {friendPositions.reduce((sum, f) => sum + f.netPosition, 0) > 0 ? "Bullish" : friendPositions.reduce((sum, f) => sum + f.netPosition, 0) < 0 ? "Bearish" : "Neutral"}
                          </p>
                          <p style={{ color: "#64748b", fontSize: "0.65rem", margin: 0 }}>Circle Sentiment</p>
                        </div>
                      </div>
                      {/* Copy Circle Sentiment Button */}
                      {market.status === "Active" && !isExpired && friendPositions.reduce((sum, f) => sum + f.netPosition, 0) !== 0 && (
                        <button
                          onClick={() => {
                            const circleSentiment = friendPositions.reduce((sum, f) => sum + f.netPosition, 0);
                            const isYesTrade = circleSentiment > 0;
                            setBuyType(isYesTrade ? "yes" : "no");
                            setShareAmount(1);
                            setShowBuyModal(true);
                            toast.info("Copy Circle", `Following your circle's ${isYesTrade ? "bullish" : "bearish"} sentiment`);
                          }}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "none",
                            background: friendPositions.reduce((sum, f) => sum + f.netPosition, 0) > 0
                              ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                              : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                            color: "white",
                            fontSize: "0.8rem",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                          }}
                        >
                          <span>👥</span>
                          Follow Circle ({friendPositions.reduce((sum, f) => sum + f.netPosition, 0) > 0 ? "Buy YES" : "Buy NO"})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
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

              {/* Buy a Beer Button - x402 powered */}
              <button
                onClick={() => setShowBeerModal(true)}
                disabled={!account}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
                  color: "#1f2937",
                  fontWeight: "700",
                  padding: "14px 24px",
                  borderRadius: "12px",
                  border: "none",
                  cursor: !account ? "not-allowed" : "pointer",
                  opacity: !account ? 0.5 : 1,
                  fontSize: "1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>🍺</span>
                Buy a Lodge Beer with Winnings
              </button>
              <p style={{
                textAlign: "center",
                color: "#fbbf24",
                fontSize: "0.7rem",
                marginTop: "6px",
              }}>
                Powered by x402 micropayments • $9 per beer
              </p>
            </div>
          )}

          {/* Display purchased voucher */}
          {purchasedVoucher && (
            <div style={{
              marginTop: "16px",
              background: "linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%)",
              border: "2px solid #fbbf24",
              borderRadius: "12px",
              padding: "16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <span style={{ fontSize: "1.5rem" }}>🎫</span>
                <h4 style={{ color: "#fbbf24", fontWeight: "700", margin: 0, fontSize: "1rem" }}>Beer Voucher</h4>
              </div>
              <p style={{ color: "white", fontSize: "0.9rem", marginBottom: "8px" }}>
                {purchasedVoucher.message}
              </p>
              <div style={{
                background: "rgba(0,0,0,0.3)",
                borderRadius: "8px",
                padding: "12px",
                fontFamily: "monospace",
                textAlign: "center",
              }}>
                <p style={{ color: "#94a3b8", fontSize: "0.7rem", margin: "0 0 4px 0" }}>Redemption Code</p>
                <p style={{ color: "#fbbf24", fontSize: "1.25rem", fontWeight: "700", margin: 0, letterSpacing: "2px" }}>
                  {purchasedVoucher.redemptionCode}
                </p>
              </div>
              <ul style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: "12px", paddingLeft: "20px" }}>
                {purchasedVoucher.instructions.map((inst, idx) => (
                  <li key={idx} style={{ marginBottom: "4px" }}>{inst}</li>
                ))}
              </ul>
              <button
                onClick={() => setPurchasedVoucher(null)}
                style={{
                  width: "100%",
                  marginTop: "12px",
                  background: "rgba(100, 116, 139, 0.2)",
                  border: "1px solid rgba(100, 116, 139, 0.3)",
                  color: "#94a3b8",
                  padding: "8px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                Dismiss
              </button>
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
          <div className="glass-card mobile-modal" style={{ maxWidth: "400px", width: "100%", padding: "24px" }}>
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

      {/* Beer Purchase Modal */}
      {showBeerModal && (
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
          <div className="glass-card mobile-modal" style={{ maxWidth: "400px", width: "100%", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <span style={{ fontSize: "2rem" }}>🍺</span>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#fbbf24", margin: 0 }}>
                Buy Lodge Beer
              </h3>
            </div>
            <p style={{ color: "#64748b", marginBottom: "20px" }}>
              Purchase beers at {market.resortName} with your winnings via x402 micropayments
            </p>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "0.875rem", color: "#94a3b8", marginBottom: "8px" }}>
                Number of Beers
              </label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  onClick={() => setBeerAmount(Math.max(1, beerAmount - 1))}
                  style={{
                    width: "44px",
                    height: "44px",
                    background: "rgba(251, 191, 36, 0.1)",
                    border: "1px solid rgba(251, 191, 36, 0.3)",
                    borderRadius: "8px",
                    color: "#fbbf24",
                    fontSize: "1.25rem",
                    cursor: "pointer",
                  }}
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={beerAmount}
                  onChange={(e) => setBeerAmount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  style={{
                    flex: 1,
                    background: "rgba(15, 30, 55, 0.8)",
                    border: "1px solid rgba(251, 191, 36, 0.3)",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    color: "#fbbf24",
                    fontSize: "1.25rem",
                    fontWeight: "700",
                    textAlign: "center",
                  }}
                />
                <button
                  onClick={() => setBeerAmount(Math.min(10, beerAmount + 1))}
                  style={{
                    width: "44px",
                    height: "44px",
                    background: "rgba(251, 191, 36, 0.1)",
                    border: "1px solid rgba(251, 191, 36, 0.3)",
                    borderRadius: "8px",
                    color: "#fbbf24",
                    fontSize: "1.25rem",
                    cursor: "pointer",
                  }}
                >
                  +
                </button>
              </div>
              <p style={{ color: "#64748b", fontSize: "0.7rem", marginTop: "6px", textAlign: "center" }}>
                Maximum 10 beers per purchase
              </p>
            </div>

            <div style={{
              background: "rgba(251, 191, 36, 0.1)",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "24px",
              border: "1px solid rgba(251, 191, 36, 0.2)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "#94a3b8" }}>Price per beer</span>
                <span style={{ color: "#fbbf24" }}>${BEER_PRICE}.00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid rgba(251, 191, 36, 0.2)" }}>
                <span style={{ color: "white", fontWeight: "600" }}>Total</span>
                <span style={{ color: "#fbbf24", fontWeight: "700", fontSize: "1.25rem" }}>
                  ${beerAmount * BEER_PRICE}.00
                </span>
              </div>
            </div>

            {/* x402 Info */}
            <div style={{
              background: "rgba(56, 189, 248, 0.1)",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "20px",
              border: "1px solid rgba(56, 189, 248, 0.2)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ fontSize: "0.875rem" }}>⚡</span>
                <span style={{ color: "#38bdf8", fontSize: "0.8rem", fontWeight: "600" }}>x402 Payment Protocol</span>
              </div>
              <p style={{ color: "#64748b", fontSize: "0.7rem", margin: 0 }}>
                Instant micropayment processed on Monad Testnet. You&apos;ll receive a redemption code for your beer voucher.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button
                onClick={() => setShowBeerModal(false)}
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
                onClick={handleBuyBeer}
                disabled={buyingBeer || !account}
                style={{
                  background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
                  color: "#1f2937",
                  fontWeight: "700",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "none",
                  cursor: buyingBeer || !account ? "not-allowed" : "pointer",
                  opacity: buyingBeer || !account ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {buyingBeer ? (
                  <>Processing...</>
                ) : (
                  <>
                    <span>🍺</span> Buy {beerAmount} Beer{beerAmount > 1 ? "s" : ""}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

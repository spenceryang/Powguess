"use client";

import { useState } from "react";
import { useActiveAccount, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client, monadTestnet, SNOW_MARKET_ADDRESS, MOCK_USDC_ADDRESS } from "@/lib/thirdweb";
import type { Market } from "@/lib/api";

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

  const isExpired = market.resolutionTime * 1000 < Date.now();
  const timeLeft = market.resolutionTime * 1000 - Date.now();
  const daysLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60 * 24)));
  const hoursLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

  const handleBuy = async (isYes: boolean) => {
    if (!account || !SNOW_MARKET_ADDRESS || !MOCK_USDC_ADDRESS) {
      alert("Please connect your wallet and ensure contracts are deployed");
      return;
    }

    try {
      // First approve USDC
      const usdcContract = getContract({
        client,
        chain: monadTestnet,
        address: MOCK_USDC_ADDRESS,
      });

      const approveAmount = BigInt(shareAmount) * BigInt(500000); // 0.5 USDC per share

      const approveTx = prepareContractCall({
        contract: usdcContract,
        method: "function approve(address spender, uint256 amount) returns (bool)",
        params: [SNOW_MARKET_ADDRESS, approveAmount],
      });

      sendTransaction(approveTx, {
        onSuccess: async () => {
          // Then buy shares
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
              setShowBuyModal(false);
              onRefresh?.();
            },
          });
        },
      });
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  };

  const getResortEmoji = (name: string) => {
    const emojis: { [key: string]: string } = {
      "Mammoth Mountain": "🦣",
      "Palisades Tahoe": "🏔️",
      "Jackson Hole": "🐃",
      "Snowbird": "🐦",
      "Aspen": "🌲",
    };
    return emojis[name] || "⛷️";
  };

  return (
    <>
      <div className="bg-snow-800 rounded-xl border border-snow-700 overflow-hidden hover:border-blue-500 transition-all duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getResortEmoji(market.resortName)}</span>
            <div>
              <h3 className="text-xl font-bold text-white">{market.resortName}</h3>
              <p className="text-blue-200 text-sm">Target: {market.targetSnowfall}" of snow</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-snow-300 mb-4">{market.description}</p>

          {/* Odds Display */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 text-center">
              <p className="text-green-400 text-sm font-medium">YES</p>
              <p className="text-2xl font-bold text-white">{market.yesOdds}%</p>
              <p className="text-snow-400 text-xs">{market.totalYesShares} shares</p>
            </div>
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-center">
              <p className="text-red-400 text-sm font-medium">NO</p>
              <p className="text-2xl font-bold text-white">{market.noOdds}%</p>
              <p className="text-snow-400 text-xs">{market.totalNoShares} shares</p>
            </div>
          </div>

          {/* Pool Info */}
          <div className="flex justify-between items-center mb-4 text-sm">
            <span className="text-snow-400">Total Pool</span>
            <span className="text-white font-medium">${market.totalPool} USDC</span>
          </div>

          {/* Time Left */}
          <div className="flex justify-between items-center mb-4 text-sm">
            <span className="text-snow-400">Time Remaining</span>
            {isExpired ? (
              <span className="text-red-400 font-medium">Expired</span>
            ) : (
              <span className="text-blue-400 font-medium">{daysLeft}d {hoursLeft}h</span>
            )}
          </div>

          {/* Status Badge */}
          <div className="flex justify-between items-center mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              market.status === "Active"
                ? "bg-green-900/50 text-green-400 border border-green-700"
                : "bg-gray-900/50 text-gray-400 border border-gray-700"
            }`}>
              {market.status}
            </span>
            {market.outcome !== "Undecided" && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                market.outcome === "Yes"
                  ? "bg-green-900/50 text-green-400"
                  : "bg-red-900/50 text-red-400"
              }`}>
                Outcome: {market.outcome}
              </span>
            )}
          </div>

          {/* Buy Buttons */}
          {market.status === "Active" && !isExpired && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setBuyType("yes");
                  setShowBuyModal(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Buy YES @ $0.50
              </button>
              <button
                onClick={() => {
                  setBuyType("no");
                  setShowBuyModal(true);
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Buy NO @ $0.50
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Buy Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-snow-800 rounded-xl border border-snow-700 max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">
              Buy {buyType.toUpperCase()} Shares
            </h3>
            <p className="text-snow-400 mb-4">{market.resortName}</p>

            <div className="mb-4">
              <label className="block text-sm text-snow-400 mb-2">Number of Shares</label>
              <input
                type="number"
                min="1"
                value={shareAmount}
                onChange={(e) => setShareAmount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-snow-900 border border-snow-700 rounded-lg px-4 py-3 text-white"
              />
            </div>

            <div className="bg-snow-900 rounded-lg p-4 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-snow-400">Price per share</span>
                <span className="text-white">$0.50 USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-snow-400">Total cost</span>
                <span className="text-white font-bold">${(shareAmount * 0.5).toFixed(2)} USDC</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBuyModal(false)}
                className="flex-1 bg-snow-700 hover:bg-snow-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBuy(buyType === "yes")}
                disabled={isPending || !account}
                className={`flex-1 font-semibold py-3 px-4 rounded-lg transition-colors ${
                  buyType === "yes"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                } text-white disabled:opacity-50`}
              >
                {isPending ? "Processing..." : !account ? "Connect Wallet" : `Confirm ${buyType.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

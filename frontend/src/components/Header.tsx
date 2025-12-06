"use client";

import { ConnectButton } from "thirdweb/react";
import { client, monadTestnet } from "@/lib/thirdweb";
import { useBeerMode } from "@/lib/BeerModeContext";

export default function Header() {
  const { beerMode, toggleBeerMode } = useBeerMode();

  return (
    <header style={{
      borderBottom: "1px solid rgba(100, 160, 220, 0.2)",
      background: "rgba(10, 22, 40, 0.8)",
      backdropFilter: "blur(10px)",
      position: "sticky",
      top: 0,
      zIndex: 50,
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "2.5rem" }}>&#10052;</span>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "white", margin: 0 }}>PowGuess</h1>
            <p style={{ fontSize: "0.75rem", color: "#64748b", margin: 0 }}>Snowfall Prediction Markets</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Beer Mode Toggle */}
          <button
            onClick={toggleBeerMode}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "12px",
              border: beerMode
                ? "2px solid #fbbf24"
                : "1px solid rgba(100, 160, 220, 0.3)",
              background: beerMode
                ? "rgba(251, 191, 36, 0.15)"
                : "rgba(15, 30, 55, 0.8)",
              color: beerMode ? "#fbbf24" : "#94a3b8",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.875rem",
              transition: "all 0.2s",
            }}
            title={beerMode ? "Switch to USDC" : "Switch to Beer Mode"}
          >
            <span style={{ fontSize: "1.25rem" }}>{beerMode ? "🍺" : "💵"}</span>
            <span>{beerMode ? "Beer Mode" : "USDC"}</span>
          </button>
          <ConnectButton
            client={client}
            chain={monadTestnet}
            connectButton={{
              label: "Connect Wallet",
              style: {
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                color: "white",
                padding: "10px 20px",
                borderRadius: "12px",
                fontWeight: "600",
                border: "none",
                cursor: "pointer",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}

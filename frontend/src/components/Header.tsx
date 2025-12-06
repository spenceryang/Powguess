"use client";

import { ConnectButton } from "thirdweb/react";
import { client, monadTestnet } from "@/lib/thirdweb";

export default function Header() {
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
    </header>
  );
}

"use client";

import { ConnectButton } from "thirdweb/react";
import { client, monadTestnet } from "@/lib/thirdweb";

export default function Header() {
  return (
    <header className="border-b border-snow-700 bg-snow-800/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">❄️</span>
          <div>
            <h1 className="text-2xl font-bold text-white">PowGuess</h1>
            <p className="text-sm text-snow-400">Snowfall Prediction Markets</p>
          </div>
        </div>
        <ConnectButton
          client={client}
          chain={monadTestnet}
          connectButton={{
            label: "Connect Wallet",
            style: {
              backgroundColor: "#3b82f6",
              color: "white",
              padding: "10px 20px",
              borderRadius: "8px",
              fontWeight: "600",
            },
          }}
        />
      </div>
    </header>
  );
}

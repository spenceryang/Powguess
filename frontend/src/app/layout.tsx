"use client";

import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { BeerModeProvider } from "@/lib/BeerModeContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en">
      <head>
        <title>PowGuess - Snowfall Prediction Markets</title>
        <meta name="description" content="Bet on snowfall at your favorite ski resorts" />
      </head>
      <body className="bg-snow-900 text-white">
        <QueryClientProvider client={queryClient}>
          <ThirdwebProvider>
            <BeerModeProvider>
              <div className="min-h-screen">
                {children}
              </div>
            </BeerModeProvider>
          </ThirdwebProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}

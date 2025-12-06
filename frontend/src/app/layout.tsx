"use client";

import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { BeerModeProvider } from "@/lib/BeerModeContext";
import { ToastProvider } from "@/components/Toast";

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
        <link rel="icon" href="/powguess-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/powguess-logo.png" />
        <meta property="og:image" content="/powguess-logo.png" />
      </head>
      <body className="bg-snow-900 text-white">
        <QueryClientProvider client={queryClient}>
          <ThirdwebProvider>
            <BeerModeProvider>
              <ToastProvider>
                <div className="min-h-screen">
                  {children}
                </div>
              </ToastProvider>
            </BeerModeProvider>
          </ThirdwebProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}

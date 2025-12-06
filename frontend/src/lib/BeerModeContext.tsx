"use client";

import { createContext, useContext, useState, ReactNode } from "react";

// Average ski resort beer price in USD
const BEER_PRICE_USD = 9;

interface BeerModeContextType {
  beerMode: boolean;
  setBeerMode: (value: boolean) => void;
  toggleBeerMode: () => void;
  toBeer: (usdAmount: number) => string;
  beerPrice: number;
}

const BeerModeContext = createContext<BeerModeContextType | undefined>(undefined);

export function BeerModeProvider({ children }: { children: ReactNode }) {
  const [beerMode, setBeerMode] = useState(false);

  const toggleBeerMode = () => setBeerMode((prev) => !prev);

  const toBeer = (usdAmount: number): string => {
    const beers = usdAmount / BEER_PRICE_USD;
    if (beers < 1) {
      return `${(beers * 100).toFixed(0)}% of a beer`;
    } else if (beers < 2) {
      return `${beers.toFixed(1)} beers`;
    } else {
      return `${Math.round(beers)} beers`;
    }
  };

  return (
    <BeerModeContext.Provider value={{ beerMode, setBeerMode, toggleBeerMode, toBeer, beerPrice: BEER_PRICE_USD }}>
      {children}
    </BeerModeContext.Provider>
  );
}

export function useBeerMode() {
  const context = useContext(BeerModeContext);
  if (context === undefined) {
    throw new Error("useBeerMode must be used within a BeerModeProvider");
  }
  return context;
}

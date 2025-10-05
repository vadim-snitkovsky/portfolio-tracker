export interface DividendPayment {
  id: string;
  date: string; // ISO date string
  amountPerShare: number; // Dividend amount per share in account currency
}

export interface DividendPaymentWithShares extends DividendPayment {
  sharesOwned: number; // Number of shares owned at the time of dividend payment
}

export interface NavPoint {
  date: string;
  value: number; // Net asset value per share
}

export interface PurchaseLot {
  id: string;
  symbol: string;
  tradeDate: string;
  shares: number;
  pricePerShare: number;
}

export interface EquityPosition {
  symbol: string;
  name: string;
  sector: string;
  shares: number;
  averageCost: number; // Cost basis per share
  currentPrice: number; // Latest market price per share
  dividends: DividendPayment[];
  navHistory: NavPoint[];
}

export interface PortfolioSnapshot {
  asOf: string;
  equities: EquityPosition[];
  cashPosition?: number;
  lastPriceUpdate?: string; // ISO timestamp of last price refresh
  lastDividendUpdate?: string; // ISO timestamp of last dividend refresh
  seedAmount?: number; // Initial cash deposited to start the account
  seedDate?: string; // ISO date string when account was seeded
}

export interface SavedPortfolio {
  id: string; // Unique identifier
  name: string; // User-friendly name
  snapshot: PortfolioSnapshot;
  customLots: PurchaseLot[];
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface PortfolioMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

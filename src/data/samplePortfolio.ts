import type { PortfolioSnapshot, PurchaseLot } from '../types/portfolio';

export const samplePortfolio: PortfolioSnapshot = {
  asOf: '2025-01-15',
  cashPosition: 0,
  seedAmount: 90000,
  seedDate: '2025-02-10',
  equities: [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      sector: 'Technology',
      shares: 0, // Shares are now tracked in customLots
      averageCost: 142.3,
      currentPrice: 188.6,
      dividends: [
        { id: 'aapl-2024-q1', date: '2024-02-15', amountPerShare: 0.2 },
        { id: 'aapl-2024-q2', date: '2024-05-15', amountPerShare: 0.205 },
        { id: 'aapl-2024-q3', date: '2024-08-15', amountPerShare: 0.22 },
        { id: 'aapl-2024-q4', date: '2024-11-15', amountPerShare: 0.22 }
      ],
      navHistory: [
        { date: '2024-01-01', value: 179.45 },
        { date: '2024-04-01', value: 172.12 },
        { date: '2024-07-01', value: 195.50 }, // Peak value
        { date: '2024-10-01', value: 168.92 },
        { date: '2025-01-01', value: 188.6 }  // Current: down 3.5% from peak
      ]
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      sector: 'Technology',
      shares: 0, // Shares are now tracked in customLots
      averageCost: 256.15,
      currentPrice: 382.5,
      dividends: [
        { id: 'msft-2024-q1', date: '2024-03-09', amountPerShare: 0.62 },
        { id: 'msft-2024-q2', date: '2024-06-09', amountPerShare: 0.62 },
        { id: 'msft-2024-q3', date: '2024-09-09', amountPerShare: 0.67 },
        { id: 'msft-2024-q4', date: '2024-12-09', amountPerShare: 0.67 }
      ],
      navHistory: [
        { date: '2024-01-01', value: 328.32 },
        { date: '2024-04-01', value: 420.50 }, // Peak value
        { date: '2024-07-01', value: 309.75 },
        { date: '2024-10-01', value: 340.15 },
        { date: '2025-01-01', value: 382.5 }  // Current: down 9.0% from peak
      ]
    }
  ]
};

// Sample purchase lots with realistic acquisition dates
export const samplePurchaseLots: PurchaseLot[] = [
  {
    id: 'lot-aapl-1',
    symbol: 'AAPL',
    tradeDate: '2024-01-15', // Purchased before first dividend
    shares: 120,
    pricePerShare: 142.3
  },
  {
    id: 'lot-msft-1',
    symbol: 'MSFT',
    tradeDate: '2024-05-20', // Purchased after Q1 dividend, will miss it
    shares: 80,
    pricePerShare: 256.15
  }
];

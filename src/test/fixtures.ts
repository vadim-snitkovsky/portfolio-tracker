import type { PortfolioSnapshot, PurchaseLot } from '../types/portfolio';

/**
 * One position, ABC, built through 2024 from four $10 lots, paying $1.00 per share each quarter.
 * Every expected figure below is worked by hand so tests can assert exact numbers.
 *
 * Shares held before each ex-dividend date (a lot bought on the ex-date does not qualify):
 *   d1 2024-02-01: L1                = 100 shares -> $100
 *   d2 2024-05-01: L1 (L2 is same day) = 100 shares -> $100
 *   d3 2024-08-01: L1 + L2 + L3      = 170 shares -> $170
 *   d4 2024-11-01: all four          = 200 shares -> $200
 * Total dividends received: $570. Market value: 200 x $12 = $2,400. Cost basis: $2,000.
 *
 * Account: seed $10,000 + external deposit $300 (L4) = $10,300 contributed. Invested $2,000.
 *   cash = 10,300 - 2,000 + 570 = $8,870; total value = 2,400 + 8,870 = $11,270
 *   return = 970 / 10,300 = 9.4175%; dividend return = 570 / 10,300 = 5.5340%
 *
 * Funding split: L1, L2 inferred seed (seed spent 1,000 then 1,500); L3 explicit dividend;
 * L4 explicit external. Dividend lots cost $200.
 * Collection what-if (L1, L2, L4 only): shares before d1..d4 = 100, 100, 150, 180 -> $530;
 *   market value 180 x 12 = $2,160; invested $1,800; cash = 10,300 - 1,800 + 530 = $9,030;
 *   total value $11,190; return = 890 / 10,300 = 8.6408%.
 * Difference in total value: 11,270 - 11,190 = $80
 *   (= 20 reinvested shares x $12 - $200 spent + $40 of dividends those shares earned).
 */
export const abcSnapshot: PortfolioSnapshot = {
  asOf: '2024-12-31',
  seedAmount: 10000,
  seedDate: '2024-01-01',
  cashPosition: 0,
  equityMetadata: [
    {
      symbol: 'ABC',
      name: 'ABC Income Fund',
      sector: 'Test',
      shares: 0,
      averageCost: 0,
      currentPrice: 12,
      dividends: [
        { id: 'abc-d1', date: '2024-02-01', amountPerShare: 1 },
        { id: 'abc-d2', date: '2024-05-01', amountPerShare: 1 },
        { id: 'abc-d3', date: '2024-08-01', amountPerShare: 1 },
        { id: 'abc-d4', date: '2024-11-01', amountPerShare: 1 },
      ],
      navHistory: [
        { date: '2024-01-01', value: 10 },
        { date: '2024-06-01', value: 15 },
        { date: '2024-12-01', value: 12 },
      ],
    },
  ],
};

export const abcLots: PurchaseLot[] = [
  { id: 'L1', symbol: 'ABC', tradeDate: '2024-01-15', shares: 100, pricePerShare: 10 },
  { id: 'L2', symbol: 'ABC', tradeDate: '2024-05-01', shares: 50, pricePerShare: 10 },
  {
    id: 'L3',
    symbol: 'ABC',
    tradeDate: '2024-07-01',
    shares: 20,
    pricePerShare: 10,
    fundingSource: 'dividend',
  },
  {
    id: 'L4',
    symbol: 'ABC',
    tradeDate: '2024-10-01',
    shares: 30,
    pricePerShare: 10,
    fundingSource: 'external',
  },
];

export const abcExpected = {
  sharesOwnedAtEachDividend: [100, 100, 170, 200],
  dividendAmounts: [100, 100, 170, 200],
  totalDividends: 570,
  marketValue: 2400,
  costBasis: 2000,
  totalReturn: 970,
  roiPercent: 48.5,
  yieldOnCostPercent: 28.5,
  navPeak: 15,
  navErosionPercent: 20,
  contributions: 10300,
  externalContributions: 300,
  invested: 2000,
  cashBalance: 8870,
  totalValue: 11270,
  returnPercent: (970 / 10300) * 100,
  dividendReturnPercent: (570 / 10300) * 100,
  dividendsReinvested: 200,
  dividendsFromReinvestedHoldings: 40,
  collection: {
    dividends: 530,
    marketValue: 2160,
    invested: 1800,
    cashBalance: 9030,
    totalValue: 11190,
    returnPercent: (890 / 10300) * 100,
  },
  valueDifference: 80,
};

/** Reference date for trailing-twelve-month figures: every ABC dividend falls inside the window. */
export const abcAsOf = new Date('2024-12-31T12:00:00');

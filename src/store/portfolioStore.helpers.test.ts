import { describe, it, expect } from 'vitest';
import { selectEquityViews, selectMergedEquities } from './portfolioStore';
import type { PortfolioSnapshot, PurchaseLot } from '../types/portfolio';

describe('portfolioStore selectors', () => {
  describe('selectEquityViews', () => {
    it('should select equity views from state', () => {
      const state = {
        snapshot: {
          asOf: '2025-01-15',
          seedAmount: 10000,
          equities: [
            {
              symbol: 'AAPL',
              name: 'Apple Inc.',
              sector: 'Technology',
              shares: 0,
              averageCost: 150,
              currentPrice: 180,
              dividends: [],
              navHistory: []
            }
          ]
        },
        customLots: [
          {
            id: 'lot-1',
            symbol: 'AAPL',
            tradeDate: '2024-01-01',
            shares: 100,
            pricePerShare: 150
          }
        ]
      } as any;

      const views = selectEquityViews(state);
      
      expect(views).toHaveLength(1);
      expect(views[0].position.symbol).toBe('AAPL');
      expect(views[0].manualLots).toHaveLength(1);
    });

    it('should handle empty state', () => {
      const state = {
        snapshot: {
          asOf: '2025-01-15',
          seedAmount: 10000,
          equities: []
        },
        customLots: []
      } as any;

      const views = selectEquityViews(state);
      
      expect(views).toHaveLength(0);
    });

    it('should calculate dividends with shares owned', () => {
      const state = {
        snapshot: {
          asOf: '2025-01-15',
          seedAmount: 10000,
          equities: [
            {
              symbol: 'AAPL',
              name: 'Apple Inc.',
              sector: 'Technology',
              shares: 0,
              averageCost: 150,
              currentPrice: 180,
              dividends: [
                { id: 'div-1', date: '2024-02-01', amountPerShare: 0.25 },
                { id: 'div-2', date: '2024-05-01', amountPerShare: 0.25 }
              ],
              navHistory: []
            }
          ]
        },
        customLots: [
          {
            id: 'lot-1',
            symbol: 'AAPL',
            tradeDate: '2024-01-01',
            shares: 50,
            pricePerShare: 150
          },
          {
            id: 'lot-2',
            symbol: 'AAPL',
            tradeDate: '2024-03-01',
            shares: 50,
            pricePerShare: 160
          }
        ]
      } as any;

      const views = selectEquityViews(state);
      
      expect(views[0].dividendsWithShares).toHaveLength(2);
      expect(views[0].dividendsWithShares[0].sharesOwned).toBe(50); // Only lot-1 owned at div-1 date
      expect(views[0].dividendsWithShares[1].sharesOwned).toBe(100); // Both lots owned at div-2 date
    });

    it('should filter dividends before earliest acquisition', () => {
      const state = {
        snapshot: {
          asOf: '2025-01-15',
          seedAmount: 10000,
          equities: [
            {
              symbol: 'AAPL',
              name: 'Apple Inc.',
              sector: 'Technology',
              shares: 0,
              averageCost: 150,
              currentPrice: 180,
              dividends: [
                { id: 'div-1', date: '2023-12-01', amountPerShare: 0.25 }, // Before acquisition
                { id: 'div-2', date: '2024-02-01', amountPerShare: 0.25 }  // After acquisition
              ],
              navHistory: []
            }
          ]
        },
        customLots: [
          {
            id: 'lot-1',
            symbol: 'AAPL',
            tradeDate: '2024-01-01',
            shares: 100,
            pricePerShare: 150
          }
        ]
      } as any;

      const views = selectEquityViews(state);
      
      expect(views[0].dividendsWithShares).toHaveLength(1);
      expect(views[0].dividendsWithShares[0].id).toBe('div-2');
    });

    it('should handle lots-only symbols not in snapshot', () => {
      const state = {
        snapshot: {
          asOf: '2025-01-15',
          seedAmount: 10000,
          equities: []
        },
        customLots: [
          {
            id: 'lot-1',
            symbol: 'TSLA',
            tradeDate: '2024-01-01',
            shares: 50,
            pricePerShare: 200
          }
        ]
      } as any;

      const views = selectEquityViews(state);
      
      expect(views).toHaveLength(1);
      expect(views[0].position.symbol).toBe('TSLA');
      expect(views[0].position.sector).toBe('Manual Entry');
      expect(views[0].position.shares).toBe(50);
    });

    it('should sort views by symbol', () => {
      const state = {
        snapshot: {
          asOf: '2025-01-15',
          seedAmount: 10000,
          equities: []
        },
        customLots: [
          {
            id: 'lot-1',
            symbol: 'MSFT',
            tradeDate: '2024-01-01',
            shares: 50,
            pricePerShare: 300
          },
          {
            id: 'lot-2',
            symbol: 'AAPL',
            tradeDate: '2024-01-01',
            shares: 100,
            pricePerShare: 150
          }
        ]
      } as any;

      const views = selectEquityViews(state);
      
      expect(views).toHaveLength(2);
      expect(views[0].position.symbol).toBe('AAPL');
      expect(views[1].position.symbol).toBe('MSFT');
    });
  });

  describe('selectMergedEquities', () => {
    it('should select merged equities from state', () => {
      const state = {
        snapshot: {
          asOf: '2025-01-15',
          seedAmount: 10000,
          equities: [
            {
              symbol: 'AAPL',
              name: 'Apple Inc.',
              sector: 'Technology',
              shares: 0,
              averageCost: 150,
              currentPrice: 180,
              dividends: [],
              navHistory: []
            }
          ]
        },
        customLots: [
          {
            id: 'lot-1',
            symbol: 'AAPL',
            tradeDate: '2024-01-01',
            shares: 100,
            pricePerShare: 150
          }
        ]
      } as any;

      const equities = selectMergedEquities(state);
      
      expect(equities).toHaveLength(1);
      expect(equities[0].symbol).toBe('AAPL');
      expect(equities[0].shares).toBe(100);
    });

    it('should handle empty state', () => {
      const state = {
        snapshot: {
          asOf: '2025-01-15',
          seedAmount: 10000,
          equities: []
        },
        customLots: []
      } as any;

      const equities = selectMergedEquities(state);
      
      expect(equities).toHaveLength(0);
    });
  });
});


import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchQuotes, fetchDividends, mergeQuotesIntoPositions, mergeDividendsIntoPositions } from './marketData';
import type { EquityPosition } from '../types/portfolio';

// Mock fetch globally
global.fetch = vi.fn();

describe('marketData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchQuotes', () => {
    it('should return empty array for empty symbols', async () => {
      const result = await fetchQuotes([]);
      expect(result).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should fetch quotes for multiple symbols', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ c: 180.5 }],
          status: 'OK'
        })
      } as Response);

      const result = await fetchQuotes(['AAPL', 'MSFT']);
      
      expect(result).toHaveLength(2);
      expect(fetch).toHaveBeenCalledTimes(4); // 2 for quotes + 2 for NAV history
    });

    it('should handle successful quote fetch', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ c: 180.5 }],
          status: 'OK'
        })
      } as Response);

      const result = await fetchQuotes(['AAPL']);
      
      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].regularMarketPrice).toBe(180.5);
      expect(result[0].error).toBeUndefined();
    });

    it('should handle fetch errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await fetchQuotes(['AAPL']);
      
      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].error).toBeDefined();
    });

    it('should handle non-OK response', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      const result = await fetchQuotes(['INVALID']);
      
      expect(result[0].symbol).toBe('INVALID');
      expect(result[0].error).toContain('404');
    });

    it('should handle missing results in response', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'OK'
        })
      } as Response);

      const result = await fetchQuotes(['AAPL']);
      
      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].regularMarketPrice).toBeUndefined();
    });

    it('should fetch NAV history along with quotes', async () => {
      let callCount = 0;
      vi.mocked(fetch).mockImplementation(async () => {
        callCount++;
        if (callCount % 2 === 1) {
          // Quote response
          return {
            ok: true,
            json: async () => ({
              results: [{ c: 180.5 }],
              status: 'OK'
            })
          } as Response;
        } else {
          // NAV history response
          return {
            ok: true,
            json: async () => ({
              results: [
                { t: 1704067200000, c: 175.0 },
                { t: 1706745600000, c: 180.5 }
              ],
              status: 'OK'
            })
          } as Response;
        }
      });

      const result = await fetchQuotes(['AAPL']);
      
      expect(result[0].navHistory).toBeDefined();
      expect(result[0].navHistory).toHaveLength(2);
      expect(result[0].navHistory![0].value).toBe(175.0);
    });
  });

  describe('fetchDividends', () => {
    it('should return empty array for empty symbols', async () => {
      const result = await fetchDividends([]);
      expect(result).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should fetch dividends for multiple symbols', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              cash_amount: 0.25,
              ex_dividend_date: '2024-01-15',
              pay_date: '2024-01-20'
            }
          ],
          status: 'OK'
        })
      } as Response);

      const result = await fetchDividends(['AAPL', 'MSFT'], 12);
      
      expect(result).toHaveLength(2);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle successful dividend fetch', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              cash_amount: 0.25,
              ex_dividend_date: '2024-01-15',
              pay_date: '2024-01-20'
            }
          ],
          status: 'OK'
        })
      } as Response);

      const result = await fetchDividends(['AAPL'], 12);
      
      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].dividends).toHaveLength(1);
      expect(result[0].dividends[0].amountPerShare).toBe(0.25);
      expect(result[0].dividends[0].date).toBe('2024-01-15');
    });

    it('should handle fetch errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await fetchDividends(['AAPL'], 12);
      
      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].error).toBeDefined();
      expect(result[0].dividends).toEqual([]);
    });

    it('should handle non-OK response', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      const result = await fetchDividends(['INVALID'], 12);
      
      expect(result[0].symbol).toBe('INVALID');
      expect(result[0].error).toContain('404');
      expect(result[0].dividends).toEqual([]);
    });

    it('should convert all dividends from API response', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              cash_amount: 0.25,
              ex_dividend_date: '2024-01-15',
              pay_date: '2024-01-20'
            },
            {
              cash_amount: 0.30,
              ex_dividend_date: '2024-02-15',
              pay_date: '2024-02-20'
            }
          ],
          status: 'OK'
        })
      } as Response);

      const result = await fetchDividends(['AAPL'], 12);

      expect(result[0].dividends).toHaveLength(2);
      expect(result[0].dividends[0].amountPerShare).toBe(0.25);
      expect(result[0].dividends[1].amountPerShare).toBe(0.30);
    });

    it('should use custom monthsBack parameter', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [],
          status: 'OK'
        })
      } as Response);

      await fetchDividends(['AAPL'], 24);
      
      expect(fetch).toHaveBeenCalled();
      const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain('AAPL');
    });
  });

  describe('mergeQuotesIntoPositions', () => {
    it('should merge quotes into existing positions', () => {
      const positions: EquityPosition[] = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          sector: 'Technology',
          shares: 100,
          averageCost: 150,
          currentPrice: 160,
          dividends: [],
          navHistory: []
        }
      ];

      const quotes = [
        {
          symbol: 'AAPL',
          regularMarketPrice: 180.5
        }
      ];

      const result = mergeQuotesIntoPositions(positions, quotes);
      
      expect(result[0].currentPrice).toBe(180.5);
      expect(result[0].symbol).toBe('AAPL');
    });

    it('should be case-insensitive when matching symbols', () => {
      const positions: EquityPosition[] = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          sector: 'Technology',
          shares: 100,
          averageCost: 150,
          currentPrice: 160,
          dividends: [],
          navHistory: []
        }
      ];

      const quotes = [
        {
          symbol: 'aapl',
          regularMarketPrice: 180.5
        }
      ];

      const result = mergeQuotesIntoPositions(positions, quotes);
      
      expect(result[0].currentPrice).toBe(180.5);
    });

    it('should preserve positions without matching quotes', () => {
      const positions: EquityPosition[] = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          sector: 'Technology',
          shares: 100,
          averageCost: 150,
          currentPrice: 160,
          dividends: [],
          navHistory: []
        }
      ];

      const quotes = [
        {
          symbol: 'MSFT',
          regularMarketPrice: 380.5
        }
      ];

      const result = mergeQuotesIntoPositions(positions, quotes);
      
      expect(result[0].currentPrice).toBe(160);
      expect(result).toHaveLength(1);
    });

    it('should merge NAV history if provided', () => {
      const positions: EquityPosition[] = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          sector: 'Technology',
          shares: 100,
          averageCost: 150,
          currentPrice: 160,
          dividends: [],
          navHistory: []
        }
      ];

      const quotes = [
        {
          symbol: 'AAPL',
          regularMarketPrice: 180.5,
          navHistory: [
            { date: '2024-01-01', value: 175.0 },
            { date: '2024-02-01', value: 180.5 }
          ]
        }
      ];

      const result = mergeQuotesIntoPositions(positions, quotes);
      
      expect(result[0].navHistory).toHaveLength(2);
      expect(result[0].navHistory[0].value).toBe(175.0);
    });
  });

  describe('mergeDividendsIntoPositions', () => {
    it('should merge dividends into existing positions', () => {
      const positions: EquityPosition[] = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          sector: 'Technology',
          shares: 100,
          averageCost: 150,
          currentPrice: 180,
          dividends: [],
          navHistory: []
        }
      ];

      const dividendResults = [
        {
          symbol: 'AAPL',
          dividends: [
            { id: 'div-1', date: '2024-01-15', amountPerShare: 0.25 }
          ]
        }
      ];

      const result = mergeDividendsIntoPositions(positions, dividendResults);
      
      expect(result[0].dividends).toHaveLength(1);
      expect(result[0].dividends[0].amountPerShare).toBe(0.25);
    });

    it('should be case-insensitive when matching symbols', () => {
      const positions: EquityPosition[] = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          sector: 'Technology',
          shares: 100,
          averageCost: 150,
          currentPrice: 180,
          dividends: [],
          navHistory: []
        }
      ];

      const dividendResults = [
        {
          symbol: 'aapl',
          dividends: [
            { id: 'div-1', date: '2024-01-15', amountPerShare: 0.25 }
          ]
        }
      ];

      const result = mergeDividendsIntoPositions(positions, dividendResults);
      
      expect(result[0].dividends).toHaveLength(1);
    });

    it('should preserve positions without matching dividends', () => {
      const positions: EquityPosition[] = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          sector: 'Technology',
          shares: 100,
          averageCost: 150,
          currentPrice: 180,
          dividends: [
            { id: 'old-div', date: '2023-01-15', amountPerShare: 0.20 }
          ],
          navHistory: []
        }
      ];

      const dividendResults = [
        {
          symbol: 'MSFT',
          dividends: [
            { id: 'div-1', date: '2024-01-15', amountPerShare: 0.62 }
          ]
        }
      ];

      const result = mergeDividendsIntoPositions(positions, dividendResults);
      
      expect(result[0].dividends).toHaveLength(1);
      expect(result[0].dividends[0].id).toBe('old-div');
    });
  });
});


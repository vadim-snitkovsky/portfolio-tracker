import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fetchQuotes,
  fetchDividends,
  mergeQuotesIntoPositions,
  mergeDividendsIntoPositions,
} from './marketData';
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
          status: 'OK',
        }),
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
          status: 'OK',
        }),
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
        statusText: 'Not Found',
      } as Response);

      const result = await fetchQuotes(['INVALID']);

      expect(result[0].symbol).toBe('INVALID');
      expect(result[0].error).toContain('404');
    });

    it('should handle missing results in response', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'OK',
        }),
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
              status: 'OK',
            }),
          } as Response;
        } else {
          // NAV history response
          return {
            ok: true,
            json: async () => ({
              results: [
                { t: 1704067200000, c: 175.0 },
                { t: 1706745600000, c: 180.5 },
              ],
              status: 'OK',
            }),
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
              pay_date: '2024-01-20',
            },
          ],
          status: 'OK',
        }),
      } as Response);

      const result = await fetchDividends(['AAPL', 'MSFT'], '2024-01-01');

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
              pay_date: '2024-01-20',
            },
          ],
          status: 'OK',
        }),
      } as Response);

      const result = await fetchDividends(['AAPL'], '2024-01-01');

      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].dividends).toHaveLength(1);
      expect(result[0].dividends[0].amountPerShare).toBe(0.25);
      expect(result[0].dividends[0].date).toBe('2024-01-15');
    });

    it('should handle fetch errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await fetchDividends(['AAPL'], '2024-01-01');

      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].error).toBeDefined();
      expect(result[0].dividends).toEqual([]);
    });

    it('should handle non-OK response', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await fetchDividends(['INVALID'], '2024-01-01');

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
              pay_date: '2024-01-20',
            },
            {
              cash_amount: 0.3,
              ex_dividend_date: '2024-02-15',
              pay_date: '2024-02-20',
            },
          ],
          status: 'OK',
        }),
      } as Response);

      const result = await fetchDividends(['AAPL'], '2024-01-01');

      expect(result[0].dividends).toHaveLength(2);
      expect(result[0].dividends[0].amountPerShare).toBe(0.25);
      expect(result[0].dividends[1].amountPerShare).toBe(0.3);
    });

    it('uses the start date as the lower bound on ex-dividend dates', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [],
          status: 'OK',
        }),
      } as Response);

      await fetchDividends(['AAPL'], '2023-06-15');

      const callUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain('ticker=AAPL');
      expect(callUrl).toContain('ex_dividend_date.gte=2023-06-15');
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
          navHistory: [],
        },
      ];

      const quotes = [
        {
          symbol: 'AAPL',
          regularMarketPrice: 180.5,
        },
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
          navHistory: [],
        },
      ];

      const quotes = [
        {
          symbol: 'aapl',
          regularMarketPrice: 180.5,
        },
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
          navHistory: [],
        },
      ];

      const quotes = [
        {
          symbol: 'MSFT',
          regularMarketPrice: 380.5,
        },
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
          navHistory: [],
        },
      ];

      const quotes = [
        {
          symbol: 'AAPL',
          regularMarketPrice: 180.5,
          navHistory: [
            { date: '2024-01-01', value: 175.0 },
            { date: '2024-02-01', value: 180.5 },
          ],
        },
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
          navHistory: [],
        },
      ];

      const dividendResults = [
        {
          symbol: 'AAPL',
          dividends: [{ id: 'div-1', date: '2024-01-15', amountPerShare: 0.25 }],
        },
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
          navHistory: [],
        },
      ];

      const dividendResults = [
        {
          symbol: 'aapl',
          dividends: [{ id: 'div-1', date: '2024-01-15', amountPerShare: 0.25 }],
        },
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
          dividends: [{ id: 'old-div', date: '2023-01-15', amountPerShare: 0.2 }],
          navHistory: [],
        },
      ];

      const dividendResults = [
        {
          symbol: 'MSFT',
          dividends: [{ id: 'div-1', date: '2024-01-15', amountPerShare: 0.62 }],
        },
      ];

      const result = mergeDividendsIntoPositions(positions, dividendResults);

      expect(result[0].dividends).toHaveLength(1);
      expect(result[0].dividends[0].id).toBe('old-div');
    });
  });

  describe('request routing and edge cases', () => {
    const okJson = (body: unknown): Response => ({ ok: true, json: async () => body }) as Response;
    const httpError = (status: number): Response => ({ ok: false, status }) as Response;
    const brokenJson = (): Response =>
      ({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0');
        },
      }) as Response;

    // fetchQuotes hits the quote endpoint and then the NAV-history endpoint for the same
    // symbol. The history URL is the one containing /range/.
    const routeFetch = (quote: Response | Error, nav: Response | Error) => {
      vi.mocked(fetch).mockImplementation(async input => {
        const reply = String(input).includes('/range/') ? nav : quote;
        if (reply instanceof Error) throw reply;
        return reply;
      });
    };

    const requestUrls = () => vi.mocked(fetch).mock.calls.map(call => String(call[0]));
    const searchParams = (url: string) => new URL(url, 'http://localhost').searchParams;

    afterEach(() => {
      vi.mocked(fetch).mockReset();
      vi.unstubAllEnvs();
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    describe('fetchQuotes', () => {
      it('reports "Quote not found" for an empty results array and skips NAV history', async () => {
        vi.mocked(fetch).mockResolvedValue(okJson({ results: [], status: 'OK' }));

        const [result] = await fetchQuotes(['AAPL']);

        expect(result).toEqual({ symbol: 'AAPL', error: 'Quote not found' });
        expect(fetch).toHaveBeenCalledTimes(1);
      });

      it('reports "Quote not found" when the close price is not a number', async () => {
        vi.mocked(fetch).mockResolvedValue(okJson({ results: [{ c: 'n/a' }] }));

        const [result] = await fetchQuotes(['AAPL']);

        expect(result).toEqual({ symbol: 'AAPL', error: 'Quote not found' });
      });

      it('reports "Quote not found" when results is not an array', async () => {
        vi.mocked(fetch).mockResolvedValue(okJson({ results: { c: 180.5 } }));

        const [result] = await fetchQuotes(['AAPL']);

        expect(result).toEqual({ symbol: 'AAPL', error: 'Quote not found' });
      });

      it('derives the change percent from the open price', async () => {
        routeFetch(okJson({ results: [{ c: 110, o: 100 }] }), okJson({ results: [] }));

        const [result] = await fetchQuotes(['AAPL']);

        expect(result.regularMarketPrice).toBe(110);
        expect(result.regularMarketChangePercent).toBeCloseTo(10);
        expect(result.currency).toBe('USD');
      });

      it('leaves the change percent undefined when the open price is zero', async () => {
        routeFetch(okJson({ results: [{ c: 110, o: 0 }] }), okJson({ results: [] }));

        const [result] = await fetchQuotes(['AAPL']);

        expect(result.regularMarketPrice).toBe(110);
        expect(result.regularMarketChangePercent).toBeUndefined();
      });

      it('falls back to a generic message when the rejection is not an Error', async () => {
        vi.mocked(fetch).mockRejectedValue('socket hang up');

        const [result] = await fetchQuotes(['AAPL']);

        expect(result).toEqual({ symbol: 'AAPL', error: 'Unknown error fetching quotes' });
      });

      it('reports the parse error when the quote payload is not JSON', async () => {
        vi.mocked(fetch).mockResolvedValue(brokenJson());

        const [result] = await fetchQuotes(['AAPL']);

        expect(result.error).toContain('Unexpected token');
        expect(result.regularMarketPrice).toBeUndefined();
      });

      it('isolates a failing symbol from the others in the same batch', async () => {
        vi.mocked(fetch).mockImplementation(async input => {
          const url = String(input);
          if (url.includes('MSFT')) return httpError(429);
          return url.includes('/range/')
            ? okJson({ results: [] })
            : okJson({ results: [{ c: 180.5 }] });
        });

        const results = await fetchQuotes(['AAPL', 'MSFT']);

        expect(results[0]).toMatchObject({ symbol: 'AAPL', regularMarketPrice: 180.5 });
        expect(results[1]).toEqual({ symbol: 'MSFT', error: 'HTTP 429' });
      });

      it('builds a dev proxy URL with the encoded symbol and the apiKey param', async () => {
        vi.mocked(fetch).mockResolvedValue(okJson({ results: [] }));

        await fetchQuotes(['BRK/B']);

        const [url] = requestUrls();
        expect(url.startsWith('/api/polygon/v2/aggs/ticker/BRK%2FB/prev?')).toBe(true);
        const params = searchParams(url);
        expect(params.get('adjusted')).toBe('true');
        expect(params.get('limit')).toBe('1');
        expect(params.has('apiKey')).toBe(true);
      });

      it('targets the public Polygon host outside dev mode', async () => {
        vi.stubEnv('DEV', false);
        routeFetch(okJson({ results: [{ c: 180.5 }] }), okJson({ results: [] }));

        await fetchQuotes(['AAPL']);

        const [quoteUrl, navUrl] = requestUrls();
        expect(quoteUrl.startsWith('https://api.polygon.io/v2/aggs/ticker/AAPL/prev?')).toBe(true);
        expect(navUrl.startsWith('https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/month/')).toBe(
          true
        );
      });

      it('uses VITE_POLYGON_BASE_URL outside dev mode when it is set', async () => {
        vi.stubEnv('DEV', false);
        vi.stubEnv('VITE_POLYGON_BASE_URL', 'https://proxy.example.test');
        routeFetch(okJson({ results: [{ c: 180.5 }] }), okJson({ results: [] }));

        await fetchQuotes(['AAPL']);

        const [quoteUrl, navUrl] = requestUrls();
        expect(quoteUrl.startsWith('https://proxy.example.test/v2/aggs/ticker/AAPL/prev?')).toBe(
          true
        );
        expect(
          navUrl.startsWith('https://proxy.example.test/v2/aggs/ticker/AAPL/range/1/month/')
        ).toBe(true);
      });
    });

    describe('NAV history', () => {
      const quote = () => okJson({ results: [{ c: 180.5 }] });

      it('requests a 12-month monthly range ending today', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
        routeFetch(quote(), okJson({ results: [] }));

        await fetchQuotes(['AAPL']);

        const [, navUrl] = requestUrls();
        expect(
          navUrl.startsWith('/api/polygon/v2/aggs/ticker/AAPL/range/1/month/2024-06-15/2025-06-15?')
        ).toBe(true);
        const params = searchParams(navUrl);
        expect(params.get('adjusted')).toBe('true');
        expect(params.get('sort')).toBe('asc');
        expect(params.get('limit')).toBe('50');
        expect(params.has('apiKey')).toBe(true);
      });

      it('returns an empty history on a non-OK response without failing the quote', async () => {
        routeFetch(quote(), httpError(500));

        const [result] = await fetchQuotes(['AAPL']);

        expect(result.regularMarketPrice).toBe(180.5);
        expect(result.error).toBeUndefined();
        expect(result.navHistory).toEqual([]);
      });

      it('returns an empty history when results is missing', async () => {
        routeFetch(quote(), okJson({ status: 'OK' }));

        const [result] = await fetchQuotes(['AAPL']);

        expect(result.navHistory).toEqual([]);
      });

      it('returns an empty history when results is empty', async () => {
        routeFetch(quote(), okJson({ results: [], status: 'OK' }));

        const [result] = await fetchQuotes(['AAPL']);

        expect(result.navHistory).toEqual([]);
      });

      it('drops bars without a numeric timestamp and close', async () => {
        routeFetch(
          quote(),
          okJson({
            results: [
              { t: 1704067200000, c: 175 },
              { c: 176 },
              { t: 1706745600000 },
              { t: '1709251200000', c: 177 },
            ],
          })
        );

        const [result] = await fetchQuotes(['AAPL']);

        expect(result.navHistory).toEqual([{ date: '2024-01-01', value: 175 }]);
      });

      it('logs and returns an empty history when the request throws', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const failure = new Error('Network down');
        routeFetch(quote(), failure);

        const [result] = await fetchQuotes(['AAPL']);

        expect(result.regularMarketPrice).toBe(180.5);
        expect(result.error).toBeUndefined();
        expect(result.navHistory).toEqual([]);
        expect(errorSpy).toHaveBeenCalledWith('Failed to fetch NAV history for AAPL:', failure);
      });
    });

    describe('fetchDividends', () => {
      it('omits the start-date filter when no startDate is given', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
        vi.mocked(fetch).mockResolvedValue(okJson({ results: [] }));

        await fetchDividends(['AAPL']);

        const [url] = requestUrls();
        expect(url.startsWith('/api/polygon/v3/reference/dividends?')).toBe(true);
        const params = searchParams(url);
        expect(params.get('ticker')).toBe('AAPL');
        expect(params.get('ex_dividend_date.lte')).toBe('2025-06-15');
        expect(params.get('limit')).toBe('100');
        expect(params.has('apiKey')).toBe(true);
        expect(params.has('ex_dividend_date.gte')).toBe(false);
      });

      it('adds ex_dividend_date.gte when a startDate is given', async () => {
        vi.mocked(fetch).mockResolvedValue(okJson({ results: [] }));

        await fetchDividends(['AAPL'], '2024-01-01');

        expect(searchParams(requestUrls()[0]).get('ex_dividend_date.gte')).toBe('2024-01-01');
      });

      it('targets the public Polygon host outside dev mode', async () => {
        vi.stubEnv('DEV', false);
        vi.mocked(fetch).mockResolvedValue(okJson({ results: [] }));

        await fetchDividends(['AAPL']);

        expect(requestUrls()[0].startsWith('https://api.polygon.io/v3/reference/dividends?')).toBe(
          true
        );
      });

      it('uses VITE_POLYGON_BASE_URL outside dev mode when it is set', async () => {
        vi.stubEnv('DEV', false);
        vi.stubEnv('VITE_POLYGON_BASE_URL', 'https://proxy.example.test');
        vi.mocked(fetch).mockResolvedValue(okJson({ results: [] }));

        await fetchDividends(['AAPL']);

        expect(
          requestUrls()[0].startsWith('https://proxy.example.test/v3/reference/dividends?')
        ).toBe(true);
      });

      it('returns no dividends and no error when results is empty', async () => {
        vi.mocked(fetch).mockResolvedValue(okJson({ results: [], status: 'OK' }));

        const [result] = await fetchDividends(['AAPL']);

        expect(result).toEqual({ symbol: 'AAPL', dividends: [] });
      });

      it('returns no dividends when results is missing', async () => {
        vi.mocked(fetch).mockResolvedValue(okJson({ status: 'OK' }));

        const [result] = await fetchDividends(['AAPL']);

        expect(result).toEqual({ symbol: 'AAPL', dividends: [] });
      });

      it('keeps Polygon ids and generates one for entries without an id', async () => {
        vi.mocked(fetch).mockResolvedValue(
          okJson({
            results: [
              {
                id: 'E8F6A1',
                cash_amount: 0.25,
                ex_dividend_date: '2024-01-15',
                pay_date: '2024-01-20',
              },
              { cash_amount: 0.3, ex_dividend_date: '2024-04-15', pay_date: '2024-04-20' },
            ],
          })
        );

        const [result] = await fetchDividends(['AAPL']);

        expect(result.dividends.map(dividend => dividend.id)).toEqual([
          'E8F6A1',
          'AAPL-2024-04-15-1',
        ]);
      });

      it('sorts dividends by ex-dividend date ascending', async () => {
        vi.mocked(fetch).mockResolvedValue(
          okJson({
            results: [
              { cash_amount: 0.3, ex_dividend_date: '2024-07-15', pay_date: '2024-07-20' },
              { cash_amount: 0.25, ex_dividend_date: '2024-01-15', pay_date: '2024-01-20' },
              { cash_amount: 0.28, ex_dividend_date: '2024-04-15', pay_date: '2024-04-20' },
            ],
          })
        );

        const [result] = await fetchDividends(['AAPL']);

        expect(result.dividends.map(dividend => dividend.date)).toEqual([
          '2024-01-15',
          '2024-04-15',
          '2024-07-15',
        ]);
        expect(result.dividends.map(dividend => dividend.amountPerShare)).toEqual([
          0.25, 0.28, 0.3,
        ]);
      });

      it('falls back to a generic message when the rejection is not an Error', async () => {
        vi.mocked(fetch).mockRejectedValue('socket hang up');

        const [result] = await fetchDividends(['AAPL']);

        expect(result).toEqual({
          symbol: 'AAPL',
          dividends: [],
          error: 'Unknown error fetching dividends',
        });
      });

      it('reports the parse error when the payload is not JSON', async () => {
        vi.mocked(fetch).mockResolvedValue(brokenJson());

        const [result] = await fetchDividends(['AAPL']);

        expect(result.dividends).toEqual([]);
        expect(result.error).toContain('Unexpected token');
      });

      it('reports an error when results is not an array', async () => {
        vi.mocked(fetch).mockResolvedValue(okJson({ results: 'oops' }));

        const [result] = await fetchDividends(['AAPL']);

        expect(result.dividends).toEqual([]);
        expect(result.error).toBeDefined();
      });
    });

    describe('merge helpers', () => {
      const position: EquityPosition = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        sector: 'Technology',
        shares: 100,
        averageCost: 150,
        currentPrice: 160,
        dividends: [{ id: 'old-div', date: '2023-01-15', amountPerShare: 0.2 }],
        navHistory: [{ date: '2024-01-01', value: 175 }],
      };

      it('mergeQuotesIntoPositions keeps the stored NAV history when the quote has an empty one', () => {
        const [merged] = mergeQuotesIntoPositions(
          [position],
          [{ symbol: 'AAPL', regularMarketPrice: 180.5, navHistory: [] }]
        );

        expect(merged.currentPrice).toBe(180.5);
        expect(merged.navHistory).toEqual(position.navHistory);
      });

      it('mergeQuotesIntoPositions ignores quotes that carry only an error', () => {
        const [merged] = mergeQuotesIntoPositions(
          [position],
          [{ symbol: 'AAPL', error: 'HTTP 404' }]
        );

        expect(merged).toBe(position);
      });

      it('mergeDividendsIntoPositions keeps the stored dividends when the result has none', () => {
        const [merged] = mergeDividendsIntoPositions(
          [position],
          [{ symbol: 'AAPL', dividends: [] }]
        );

        expect(merged).toBe(position);
      });
    });
  });
});

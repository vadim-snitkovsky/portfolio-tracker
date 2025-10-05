import type { DividendPayment, EquityPosition, NavPoint } from '../types/portfolio';

export interface QuoteResult {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  navHistory?: NavPoint[];
  error?: string;
}

export interface DividendResult {
  symbol: string;
  dividends: DividendPayment[];
  error?: string;
}

interface PolygonDividend {
  cash_amount: number;
  ex_dividend_date: string;
  pay_date: string;
  declaration_date?: string;
  record_date?: string;
  frequency?: number;
  dividend_type?: string;
  id?: string;
}

const POLYGON_BASE_URL = import.meta.env.VITE_POLYGON_BASE_URL ?? 'https://api.polygon.io';
const POLYGON_API_KEY = import.meta.env.VITE_POLYGON_API_KEY ?? '';

const buildPolygonUrl = (symbol: string): string => {
  const basePath = `/v2/aggs/ticker/${encodeURIComponent(symbol)}/prev`;
  const params = new URLSearchParams({ adjusted: 'true', limit: '1', apiKey: POLYGON_API_KEY });
  if (import.meta.env.DEV) {
    return `/api/polygon${basePath}?${params.toString()}`;
  }
  const base = import.meta.env.VITE_POLYGON_BASE_URL ?? POLYGON_BASE_URL;
  return `${base}${basePath}?${params.toString()}`;
};

const buildPolygonNavHistoryUrl = (symbol: string, monthsBack: number = 12): string => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const basePath = `/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/month/${formatDate(startDate)}/${formatDate(endDate)}`;
  const params = new URLSearchParams({
    adjusted: 'true',
    sort: 'asc',
    limit: '50',
    apiKey: POLYGON_API_KEY
  });

  if (import.meta.env.DEV) {
    return `/api/polygon${basePath}?${params.toString()}`;
  }
  const base = import.meta.env.VITE_POLYGON_BASE_URL ?? POLYGON_BASE_URL;
  return `${base}${basePath}?${params.toString()}`;
};

const fetchNavHistory = async (symbol: string, monthsBack: number = 12): Promise<NavPoint[]> => {
  try {
    const response = await fetch(buildPolygonNavHistoryUrl(symbol, monthsBack));
    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      results?: Array<{ t?: number; c?: number }>;
      status?: string;
    };

    if (!data.results || data.results.length === 0) {
      return [];
    }

    // Convert Polygon aggregates to NavPoint format
    return data.results
      .filter((bar) => typeof bar.t === 'number' && typeof bar.c === 'number')
      .map((bar) => ({
        date: new Date(bar.t!).toISOString().split('T')[0],
        value: bar.c!
      }));
  } catch (error) {
    console.error(`Failed to fetch NAV history for ${symbol}:`, error);
    return [];
  }
};

export const fetchQuotes = async (symbols: string[]): Promise<QuoteResult[]> => {
  if (symbols.length === 0) {
    return [];
  }

  const results = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const response = await fetch(buildPolygonUrl(symbol));
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as {
          results?: Array<{ c?: number; o?: number }>;
        };
        const latest = data.results?.[0];

        if (!latest || typeof latest.c !== 'number') {
          return { symbol, error: 'Quote not found' } satisfies QuoteResult;
        }

        const open = typeof latest.o === 'number' ? latest.o : undefined;
        const price = latest.c;
        const changePercent =
          open && open !== 0 ? ((price - open) / open) * 100 : undefined;

        // Fetch NAV history in parallel
        const navHistory = await fetchNavHistory(symbol, 12);

        return {
          symbol,
          regularMarketPrice: price,
          regularMarketChangePercent: changePercent,
          currency: 'USD',
          navHistory
        } satisfies QuoteResult;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error fetching quotes';
        return { symbol, error: message } satisfies QuoteResult;
      }
    })
  );

  return results;
};

export const mergeQuotesIntoPositions = (
  positions: EquityPosition[],
  quotes: QuoteResult[]
): EquityPosition[] => {
  const bySymbol = new Map(quotes.map((quote) => [quote.symbol.toUpperCase(), quote]));

  return positions.map((position) => {
    const quote = bySymbol.get(position.symbol.toUpperCase());
    if (!quote || typeof quote.regularMarketPrice !== 'number') {
      return position;
    }

    return {
      ...position,
      currentPrice: quote.regularMarketPrice,
      navHistory: quote.navHistory && quote.navHistory.length > 0 ? quote.navHistory : position.navHistory
    };
  });
};

const buildPolygonDividendsUrl = (symbol: string, monthsBack: number = 12): string => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);

  const formatDate = (date: Date): string => date.toISOString().split('T')[0];

  const basePath = `/v3/reference/dividends`;
  const params = new URLSearchParams({
    ticker: symbol,
    'ex_dividend_date.gte': formatDate(startDate),
    'ex_dividend_date.lte': formatDate(endDate),
    limit: '100',
    apiKey: POLYGON_API_KEY
  });

  if (import.meta.env.DEV) {
    return `/api/polygon${basePath}?${params.toString()}`;
  }
  const base = import.meta.env.VITE_POLYGON_BASE_URL ?? POLYGON_BASE_URL;
  return `${base}${basePath}?${params.toString()}`;
};

export const fetchDividends = async (
  symbols: string[],
  monthsBack: number = 12
): Promise<DividendResult[]> => {
  if (symbols.length === 0) {
    return [];
  }

  const results = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const response = await fetch(buildPolygonDividendsUrl(symbol, monthsBack));
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as {
          results?: PolygonDividend[];
          status?: string;
        };

        if (!data.results || data.results.length === 0) {
          return { symbol, dividends: [] } satisfies DividendResult;
        }

        // Convert Polygon dividends to our DividendPayment format
        const dividends: DividendPayment[] = data.results
          .map((div, index) => ({
            id: div.id || `${symbol}-${div.ex_dividend_date}-${index}`,
            date: div.ex_dividend_date,
            amountPerShare: div.cash_amount
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return {
          symbol,
          dividends
        } satisfies DividendResult;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error fetching dividends';
        return { symbol, dividends: [], error: message } satisfies DividendResult;
      }
    })
  );

  return results;
};

export const mergeDividendsIntoPositions = (
  positions: EquityPosition[],
  dividendResults: DividendResult[]
): EquityPosition[] => {
  const bySymbol = new Map(
    dividendResults.map((result) => [result.symbol.toUpperCase(), result])
  );

  return positions.map((position) => {
    const result = bySymbol.get(position.symbol.toUpperCase());
    if (!result || result.dividends.length === 0) {
      return position;
    }

    return {
      ...position,
      dividends: result.dividends
    };
  });
};

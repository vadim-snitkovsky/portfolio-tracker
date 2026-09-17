import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { EquityPosition, PortfolioSnapshot, PurchaseLot } from '../types/portfolio';

vi.mock('../utils/storage', () => ({
  loadCustomLots: () => [],
  persistCustomLots: vi.fn(),
  clearCustomLots: vi.fn(),
  loadSnapshot: () => null,
  persistSnapshot: vi.fn(),
  clearSnapshot: vi.fn(),
  loadSavedPortfolios: () => [],
  saveSavedPortfolios: vi.fn(),
  getActivePortfolioId: () => null,
  setActivePortfolioId: vi.fn(),
  savePortfolio: vi.fn((id: string, name: string, snapshot: unknown, lots: unknown) => ({
    id,
    name,
    snapshot,
    customLots: lots,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  })),
  loadPortfolioById: vi.fn(() => null),
  deletePortfolio: vi.fn(() => true),
  renamePortfolio: vi.fn(() => true),
  getPortfolioMetadataList: vi.fn(() => []),
}));

vi.mock('../services/marketData', async importOriginal => {
  const actual = await importOriginal<typeof import('../services/marketData')>();
  return { ...actual, fetchQuotes: vi.fn(), fetchDividends: vi.fn() };
});

import {
  calculateEquityMetrics,
  calculatePortfolioMetrics,
  deriveEquityViews,
  selectMergedEquities,
  usePortfolioStore,
} from './portfolioStore';
import { fetchDividends, fetchQuotes } from '../services/marketData';
import { totalDividendsReceived } from '../utils/portfolioMath';
import { abcExpected, abcLots, abcSnapshot } from '../test/fixtures';

const position = (overrides: Partial<EquityPosition> = {}): EquityPosition => ({
  symbol: 'ABC',
  name: 'ABC',
  sector: 'Test',
  shares: 0,
  averageCost: 0,
  currentPrice: 12,
  dividends: [],
  navHistory: [],
  ...overrides,
});

describe('deriveEquityViews entitlement rules', () => {
  it('counts only shares bought strictly before each ex-dividend date', () => {
    const [view] = deriveEquityViews(abcSnapshot, abcLots);
    expect(view.dividendsWithShares.map(d => d.sharesOwned)).toEqual(
      abcExpected.sharesOwnedAtEachDividend
    );
  });

  it('drops a dividend whose ex-date is the same day as the first purchase', () => {
    const snapshot: PortfolioSnapshot = {
      ...abcSnapshot,
      equityMetadata: [
        position({
          dividends: [
            { id: 'same-day', date: '2024-01-15', amountPerShare: 1 },
            { id: 'next-day', date: '2024-01-16', amountPerShare: 1 },
          ],
        }),
      ],
    };
    const [view] = deriveEquityViews(snapshot, abcLots.slice(0, 1));
    expect(view.dividendsWithShares.map(d => d.id)).toEqual(['next-day']);
    expect(view.position.dividends.map(d => d.id)).toEqual(['next-day']);
  });

  it('attaches shares owned to the position dividends so every metric agrees', () => {
    const views = deriveEquityViews(abcSnapshot, abcLots);
    const metrics = calculateEquityMetrics(views[0].position);
    expect(metrics.totalDividends).toBe(abcExpected.totalDividends);
    expect(metrics.costBasis).toBe(abcExpected.costBasis);
    expect(metrics.marketValue).toBe(abcExpected.marketValue);
    expect(metrics.totalReturn).toBe(abcExpected.totalReturn);
    expect(metrics.roi).toBeCloseTo(abcExpected.roiPercent, 10);
    expect(metrics.dividendYieldOnCost).toBeCloseTo(abcExpected.yieldOnCostPercent, 10);
    expect(metrics.navPeak).toBe(abcExpected.navPeak);
    expect(metrics.navDecayPercent).toBeCloseTo(abcExpected.navErosionPercent, 10);
  });

  it('gives the overview the same dividend total as the cash flow report', () => {
    usePortfolioStore.setState({ snapshot: abcSnapshot, customLots: abcLots });
    const state = usePortfolioStore.getState();
    const overview = calculatePortfolioMetrics(
      selectMergedEquities(state).filter(p => p.shares > 0)
    );
    const views = deriveEquityViews(state.snapshot, state.customLots);
    expect(overview.totalDividends).toBe(totalDividendsReceived(views));
    expect(overview.totalDividends).toBe(abcExpected.totalDividends);
  });

  it('still multiplies by current shares for raw snapshot dividends without share data', () => {
    const metrics = calculateEquityMetrics(
      position({
        shares: 10,
        averageCost: 5,
        dividends: [
          { id: 'a', date: '2024-01-01', amountPerShare: 1 },
          { id: 'b', date: '2024-02-01', amountPerShare: 2 },
        ],
      })
    );
    expect(metrics.totalDividends).toBe(30);
  });

  it('matches lots to a snapshot symbol regardless of letter case', () => {
    const snapshot: PortfolioSnapshot = {
      ...abcSnapshot,
      equityMetadata: [position({ symbol: 'abc' })],
    };
    const views = deriveEquityViews(snapshot, abcLots);
    expect(views).toHaveLength(1);
    expect(views[0].position.shares).toBe(200);
    expect(views[0].manualLots).toHaveLength(4);
  });

  it('prices a lot-only symbol at its most recent trade, not the last one entered', () => {
    const lots: PurchaseLot[] = [
      { id: 'newer', symbol: 'XYZ', tradeDate: '2024-06-01', shares: 1, pricePerShare: 30 },
      { id: 'older', symbol: 'XYZ', tradeDate: '2024-01-01', shares: 1, pricePerShare: 20 },
    ];
    const [view] = deriveEquityViews({ ...abcSnapshot, equityMetadata: [] }, lots);
    expect(view.position.currentPrice).toBe(30);
    expect(view.position.averageCost).toBe(25);
    expect(view.position.sector).toBe('Manual Entry');
  });
});

describe('snapshot migration', () => {
  beforeEach(() => {
    usePortfolioStore.setState({ snapshot: abcSnapshot, customLots: [] });
  });

  it('renames the deprecated equities field and drops it', () => {
    const legacy = {
      asOf: '2024-01-01',
      equities: [position({ shares: 5 })],
    } as unknown as PortfolioSnapshot;
    usePortfolioStore.getState().setSnapshot(legacy);
    const { snapshot } = usePortfolioStore.getState();
    expect(snapshot.equityMetadata.map(e => e.symbol)).toEqual(['ABC']);
    expect(snapshot.equityMetadata[0].shares).toBe(0);
    expect('equities' in snapshot).toBe(false);
  });

  it('does not invent a seed for a snapshot that has none', () => {
    usePortfolioStore.getState().setSnapshot({ asOf: '2024-01-01', equityMetadata: [] });
    const { snapshot } = usePortfolioStore.getState();
    expect(snapshot.seedAmount).toBeUndefined();
    expect(snapshot.seedDate).toBeUndefined();
  });

  it('does not mutate the snapshot it was given', () => {
    const legacy = {
      asOf: '2024-01-01',
      equities: [position({ shares: 5 })],
    } as unknown as PortfolioSnapshot;
    usePortfolioStore.getState().setSnapshot(legacy);
    expect((legacy as unknown as { equities: unknown[] }).equities).toHaveLength(1);
    expect(legacy.equityMetadata).toBeUndefined();
  });
});

describe('loadPortfolio', () => {
  it('turns snapshot share counts into seed lots only for symbols without lots', () => {
    const snapshot: PortfolioSnapshot = {
      asOf: '2024-03-01',
      equityMetadata: [
        position({ symbol: 'ABC', shares: 7, averageCost: 9 }),
        position({ symbol: 'DEF', shares: 40, averageCost: 3 }),
      ],
    };
    usePortfolioStore.getState().loadPortfolio(snapshot, abcLots.slice(0, 1));
    const { customLots, snapshot: stored } = usePortfolioStore.getState();
    expect(customLots.map(l => l.id)).toEqual(['L1', 'seed-DEF-1']);
    expect(customLots[1]).toMatchObject({
      symbol: 'DEF',
      tradeDate: '2024-03-01',
      shares: 40,
      pricePerShare: 3,
    });
    expect(stored.equityMetadata.map(e => e.shares)).toEqual([0, 0]);
  });
});

describe('refreshQuotes', () => {
  beforeEach(() => {
    vi.mocked(fetchQuotes).mockReset();
    vi.mocked(fetchDividends).mockReset();
  });

  it('returns early with no symbols', async () => {
    usePortfolioStore.setState({
      snapshot: { ...abcSnapshot, equityMetadata: [] },
      customLots: [],
    });
    await expect(usePortfolioStore.getState().refreshQuotes()).resolves.toEqual([]);
    expect(fetchQuotes).not.toHaveBeenCalled();
  });

  it('creates a position for a lot-only symbol using the blended lot cost', async () => {
    const lots: PurchaseLot[] = [
      { id: 'a', symbol: 'XYZ', tradeDate: '2024-01-01', shares: 10, pricePerShare: 5 },
      { id: 'b', symbol: 'XYZ', tradeDate: '2024-02-01', shares: 10, pricePerShare: 7 },
    ];
    usePortfolioStore.setState({
      snapshot: { ...abcSnapshot, equityMetadata: [] },
      customLots: lots,
    });
    vi.mocked(fetchQuotes).mockResolvedValue([
      { symbol: 'XYZ', regularMarketPrice: 9, navHistory: [{ date: '2024-01-01', value: 8 }] },
    ]);
    await usePortfolioStore.getState().refreshQuotes();
    const { snapshot, quoteStatus } = usePortfolioStore.getState();
    expect(fetchQuotes).toHaveBeenCalledWith(['XYZ']);
    expect(snapshot.equityMetadata).toHaveLength(1);
    expect(snapshot.equityMetadata[0]).toMatchObject({
      symbol: 'XYZ',
      averageCost: 6,
      currentPrice: 9,
      shares: 0,
      sector: 'Manual Entry',
      navHistory: [{ date: '2024-01-01', value: 8 }],
    });
    expect(snapshot.lastPriceUpdate).toBeDefined();
    expect(quoteStatus.isLoading).toBe(false);
    expect(quoteStatus.error).toBeUndefined();
  });

  it('reports symbols that failed', async () => {
    usePortfolioStore.setState({ snapshot: abcSnapshot, customLots: abcLots });
    vi.mocked(fetchQuotes).mockResolvedValue([{ symbol: 'ABC', error: 'Quote not found' }]);
    await usePortfolioStore.getState().refreshQuotes();
    expect(usePortfolioStore.getState().quoteStatus.error).toBe(
      'Failed to refresh: ABC (Quote not found)'
    );
    // The existing price is kept when the quote fails.
    expect(usePortfolioStore.getState().snapshot.equityMetadata[0].currentPrice).toBe(12);
  });
});

describe('refreshDividends', () => {
  beforeEach(() => {
    vi.mocked(fetchQuotes).mockReset();
    vi.mocked(fetchDividends).mockReset();
  });

  it('looks back to the earliest of the lot dates and the seed date', async () => {
    usePortfolioStore.setState({ snapshot: abcSnapshot, customLots: abcLots });
    vi.mocked(fetchDividends).mockResolvedValue([{ symbol: 'ABC', dividends: [] }]);
    await usePortfolioStore.getState().refreshDividends();
    expect(fetchDividends).toHaveBeenCalledWith(['ABC'], '2024-01-01');
  });

  it('passes no start date when there are neither lots nor a seed date', async () => {
    usePortfolioStore.setState({
      snapshot: { asOf: '2024-01-01', equityMetadata: [position()] },
      customLots: [],
    });
    vi.mocked(fetchDividends).mockResolvedValue([{ symbol: 'ABC', dividends: [] }]);
    await usePortfolioStore.getState().refreshDividends();
    expect(fetchDividends).toHaveBeenCalledWith(['ABC'], undefined);
  });

  it('creates a position for a lot-only symbol that paid dividends', async () => {
    const lots: PurchaseLot[] = [
      { id: 'a', symbol: 'XYZ', tradeDate: '2024-01-01', shares: 10, pricePerShare: 5 },
      { id: 'b', symbol: 'XYZ', tradeDate: '2024-02-01', shares: 10, pricePerShare: 7 },
    ];
    usePortfolioStore.setState({
      snapshot: { ...abcSnapshot, equityMetadata: [] },
      customLots: lots,
    });
    const dividends = [{ id: 'x1', date: '2024-03-01', amountPerShare: 0.5 }];
    vi.mocked(fetchDividends).mockResolvedValue([{ symbol: 'XYZ', dividends }]);
    await usePortfolioStore.getState().refreshDividends();
    const { snapshot, dividendStatus } = usePortfolioStore.getState();
    expect(snapshot.equityMetadata[0]).toMatchObject({
      symbol: 'XYZ',
      averageCost: 6,
      currentPrice: 6,
      dividends,
      navHistory: [],
    });
    expect(snapshot.lastDividendUpdate).toBeDefined();
    expect(dividendStatus.error).toBeUndefined();
  });

  it('does not create a position for a lot-only symbol with no dividends', async () => {
    usePortfolioStore.setState({
      snapshot: { ...abcSnapshot, equityMetadata: [] },
      customLots: [
        { id: 'a', symbol: 'XYZ', tradeDate: '2024-01-01', shares: 1, pricePerShare: 5 },
      ],
    });
    vi.mocked(fetchDividends).mockResolvedValue([{ symbol: 'XYZ', dividends: [] }]);
    await usePortfolioStore.getState().refreshDividends();
    expect(usePortfolioStore.getState().snapshot.equityMetadata).toEqual([]);
  });

  it('reports symbols that failed', async () => {
    usePortfolioStore.setState({ snapshot: abcSnapshot, customLots: abcLots });
    vi.mocked(fetchDividends).mockResolvedValue([
      { symbol: 'ABC', dividends: [], error: 'HTTP 500' },
    ]);
    await usePortfolioStore.getState().refreshDividends();
    expect(usePortfolioStore.getState().dividendStatus.error).toBe(
      'Failed to refresh dividends: ABC (HTTP 500)'
    );
    // Existing dividends survive a failed refresh.
    expect(usePortfolioStore.getState().snapshot.equityMetadata[0].dividends).toHaveLength(4);
  });
});

describe('saved portfolio bookkeeping', () => {
  it('Save As writes a new entry even when a portfolio is active', () => {
    usePortfolioStore.setState({ activePortfolioId: 'p1', activePortfolioName: 'One' });
    const saved = usePortfolioStore.getState().saveCurrentPortfolioAs('Copy of One');
    expect(saved.id).not.toBe('p1');
    expect(saved.name).toBe('Copy of One');
    expect(usePortfolioStore.getState().activePortfolioId).toBe(saved.id);
    expect(usePortfolioStore.getState().activePortfolioName).toBe('Copy of One');
  });

  it('plain Save keeps writing to the active entry', () => {
    usePortfolioStore.setState({ activePortfolioId: 'p1', activePortfolioName: 'One' });
    const saved = usePortfolioStore.getState().saveCurrentPortfolio('One renamed');
    expect(saved.id).toBe('p1');
    expect(usePortfolioStore.getState().activePortfolioName).toBe('One renamed');
  });

  it('clears the active portfolio when it is the one deleted', () => {
    usePortfolioStore.setState({ activePortfolioId: 'p1', activePortfolioName: 'One' });
    expect(usePortfolioStore.getState().deleteSavedPortfolio('p1')).toBe(true);
    expect(usePortfolioStore.getState().activePortfolioId).toBeNull();
    expect(usePortfolioStore.getState().activePortfolioName).toBeNull();
  });

  it('leaves the active portfolio alone when another one is deleted or renamed', () => {
    usePortfolioStore.setState({ activePortfolioId: 'p1', activePortfolioName: 'One' });
    usePortfolioStore.getState().deleteSavedPortfolio('p2');
    usePortfolioStore.getState().renameSavedPortfolio('p2', 'Two');
    expect(usePortfolioStore.getState().activePortfolioId).toBe('p1');
    expect(usePortfolioStore.getState().activePortfolioName).toBe('One');
  });
});

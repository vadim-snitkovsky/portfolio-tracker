import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OverviewMetrics } from './OverviewMetrics';
import * as portfolioStore from '../../store/portfolioStore';
import type { PortfolioSnapshot, PurchaseLot } from '../../types/portfolio';

vi.mock('../../store/portfolioStore', async () => {
  const actual = await vi.importActual('../../store/portfolioStore');
  return {
    ...actual,
    usePortfolioStore: vi.fn(),
  };
});

describe('OverviewMetrics', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockSelector = (selector: any) => {
      const state = {
        snapshot: {
          asOf: '2025-01-15',
          seedAmount: 10000,
          equityMetadata: [
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
          ],
        },
        customLots: [
          {
            id: 'lot-1',
            symbol: 'AAPL',
            tradeDate: '2024-01-01',
            shares: 100,
            pricePerShare: 150,
          },
        ],
      };
      return selector(state);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(portfolioStore.usePortfolioStore).mockImplementation(mockSelector as any);
  });

  it('should render without crashing', () => {
    const { container } = render(<OverviewMetrics />);
    expect(container).toBeDefined();
  });

  it('should render with empty portfolio', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockSelector = (selector: any) => {
      const state = {
        snapshot: {
          asOf: '2025-01-15',
          seedAmount: 10000,
          equityMetadata: [],
        },
        customLots: [],
      };
      return selector(state);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(portfolioStore.usePortfolioStore).mockImplementation(mockSelector as any);

    const { container } = render(<OverviewMetrics />);
    expect(container).toBeDefined();
  });

  describe('net total return trend', () => {
    const mockStoreState = (state: { snapshot: PortfolioSnapshot; customLots: PurchaseLot[] }) => {
      const selectFrom = (selector: (current: typeof state) => unknown) => selector(state);
      vi.mocked(portfolioStore.usePortfolioStore).mockImplementation(
        selectFrom as unknown as typeof portfolioStore.usePortfolioStore
      );
    };

    const lots: PurchaseLot[] = [
      { id: 'lot-1', symbol: 'AAPL', tradeDate: '2024-01-01', shares: 100, pricePerShare: 150 },
    ];

    const snapshotAt = (currentPrice: number): PortfolioSnapshot => ({
      asOf: '2025-01-15',
      seedAmount: 10000,
      equityMetadata: [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          sector: 'Technology',
          shares: 0,
          averageCost: 150,
          currentPrice,
          dividends: [],
          navHistory: [],
        },
      ],
    });

    const netTotalReturnTrend = () =>
      screen
        .getByText('Net Total Return')
        .closest('.metric-tile')
        ?.querySelector('.metric-tile__trend') as HTMLElement;

    it('prefixes a plus sign and uses the positive style when the portfolio is up', () => {
      mockStoreState({ snapshot: snapshotAt(180), customLots: lots });

      render(<OverviewMetrics />);

      const trend = netTotalReturnTrend();
      expect(trend.textContent).toMatch(/^\+/);
      expect(trend.className).toContain('metric-tile__trend--positive');
    });

    it('omits the plus sign and uses the negative style when the portfolio is down', () => {
      mockStoreState({ snapshot: snapshotAt(120), customLots: lots });

      render(<OverviewMetrics />);

      const trend = netTotalReturnTrend();
      expect(trend.textContent).toMatch(/^-/);
      expect(trend.textContent).not.toContain('+');
      expect(trend.className).toContain('metric-tile__trend--negative');
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { OverviewMetrics } from './OverviewMetrics';
import * as portfolioStore from '../../store/portfolioStore';

vi.mock('../../store/portfolioStore', async () => {
  const actual = await vi.importActual('../../store/portfolioStore');
  return {
    ...actual,
    usePortfolioStore: vi.fn()
  };
});

describe('OverviewMetrics', () => {
  beforeEach(() => {
    const mockSelector = (selector: any) => {
      const state = {
        snapshot: {
          asOf: '2025-01-15',
          seedAmount: 10000,
          equities: [
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
      };
      return selector(state);
    };

    vi.mocked(portfolioStore.usePortfolioStore).mockImplementation(mockSelector as any);
  });

  it('should render without crashing', () => {
    const { container } = render(<OverviewMetrics />);
    expect(container).toBeDefined();
  });

  it('should render with empty portfolio', () => {
    const mockSelector = (selector: any) => {
      const state = {
        snapshot: {
          asOf: '2025-01-15',
          seedAmount: 10000,
          equities: []
        },
        customLots: []
      };
      return selector(state);
    };

    vi.mocked(portfolioStore.usePortfolioStore).mockImplementation(mockSelector as any);

    const { container } = render(<OverviewMetrics />);
    expect(container).toBeDefined();
  });
});


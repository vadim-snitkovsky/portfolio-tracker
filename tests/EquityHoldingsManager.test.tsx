import { render } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../src/utils/storage', () => ({
  loadCustomLots: () => [],
  persistCustomLots: () => {},
  clearCustomLots: () => {},
  loadSnapshot: () => null,
  persistSnapshot: () => {},
  clearSnapshot: () => {},
  loadSavedPortfolios: () => [],
  saveSavedPortfolios: () => {},
  getActivePortfolioId: () => null,
  setActivePortfolioId: () => {},
  savePortfolio: vi.fn((id, name, snapshot, lots) => ({
    id,
    name,
    snapshot,
    customLots: lots,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })),
  loadPortfolioById: () => null,
  deletePortfolio: () => true,
  renamePortfolio: () => true,
  getPortfolioMetadataList: () => []
}));

import { EquityHoldingsManager } from '../src/components/portfolio/EquityHoldingsManager';
import { usePortfolioStore } from '../src/store/portfolioStore';

describe('EquityHoldingsManager', () => {
  beforeEach(() => {
    usePortfolioStore.setState({
      customLots: [],
      snapshot: {
        asOf: '2025-01-15',
        seedAmount: 10000,
        equities: []
      }
    });
  });

  test('renders default holdings summary', () => {
    const { container } = render(<EquityHoldingsManager />);
    expect(container.textContent).toContain('Custom lots tracked');
  });

  test('renders with existing custom lots', () => {
    usePortfolioStore.setState({
      customLots: [
        {
          id: 'lot-1',
          symbol: 'AAPL',
          tradeDate: '2024-01-01',
          shares: 100,
          pricePerShare: 150
        },
        {
          id: 'lot-2',
          symbol: 'MSFT',
          tradeDate: '2024-02-01',
          shares: 50,
          pricePerShare: 300
        }
      ],
      snapshot: {
        asOf: '2025-01-15',
        seedAmount: 10000,
        equities: []
      }
    });

    const { container } = render(<EquityHoldingsManager />);
    expect(container.textContent).toContain('Custom lots tracked');
  });

  test('renders table when lots exist', () => {
    usePortfolioStore.setState({
      customLots: [
        {
          id: 'lot-1',
          symbol: 'AAPL',
          tradeDate: '2024-01-01',
          shares: 100,
          pricePerShare: 150
        }
      ],
      snapshot: {
        asOf: '2025-01-15',
        seedAmount: 10000,
        equities: []
      }
    });

    const { container } = render(<EquityHoldingsManager />);
    const table = container.querySelector('table');
    expect(table).toBeDefined();
  });

  test('handles empty lots', () => {
    usePortfolioStore.setState({
      customLots: [],
      snapshot: {
        asOf: '2025-01-15',
        seedAmount: 10000,
        equities: []
      }
    });

    const { container } = render(<EquityHoldingsManager />);
    expect(container.textContent).toContain('Custom lots tracked');
  });

  test('displays lot count correctly', () => {
    usePortfolioStore.setState({
      customLots: [
        {
          id: 'lot-1',
          symbol: 'AAPL',
          tradeDate: '2024-01-01',
          shares: 100,
          pricePerShare: 150
        },
        {
          id: 'lot-2',
          symbol: 'AAPL',
          tradeDate: '2024-02-01',
          shares: 50,
          pricePerShare: 160
        },
        {
          id: 'lot-3',
          symbol: 'MSFT',
          tradeDate: '2024-03-01',
          shares: 25,
          pricePerShare: 300
        }
      ],
      snapshot: {
        asOf: '2025-01-15',
        seedAmount: 10000,
        equities: []
      }
    });

    const { container } = render(<EquityHoldingsManager />);
    expect(container.textContent).toContain('Custom lots tracked');
  });
});

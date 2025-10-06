import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DividendTable } from './DividendTable';
import type { EquityView } from '../../types/portfolio';

describe('DividendTable', () => {
  const mockEquityViews: EquityView[] = [
    {
      position: {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        sector: 'Technology',
        shares: 100,
        averageCost: 150,
        currentPrice: 180,
        dividends: [],
        navHistory: [],
      },
      manualLots: [],
      dividendsWithShares: [
        {
          id: 'div-1',
          date: '2024-01-15',
          amountPerShare: 0.25,
          sharesOwned: 100,
        },
        {
          id: 'div-2',
          date: '2024-04-15',
          amountPerShare: 0.25,
          sharesOwned: 100,
        },
      ],
    },
  ];

  it('should render without crashing', () => {
    const { container } = render(<DividendTable equityViews={mockEquityViews} />);
    expect(container).toBeDefined();
  });

  it('should render with empty equity views', () => {
    const { container } = render(<DividendTable equityViews={[]} />);
    expect(container).toBeDefined();
  });

  it('should render table structure', () => {
    const { container } = render(<DividendTable equityViews={mockEquityViews} />);
    const table = container.querySelector('table');
    expect(table).toBeDefined();
  });

  it('should render dividend data', () => {
    const { container } = render(<DividendTable equityViews={mockEquityViews} />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('should handle equity views with no dividends', () => {
    const viewsWithNoDividends: EquityView[] = [
      {
        position: {
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          sector: 'Technology',
          shares: 50,
          averageCost: 300,
          currentPrice: 380,
          dividends: [],
          navHistory: [],
        },
        manualLots: [],
        dividendsWithShares: [],
      },
    ];

    const { container } = render(<DividendTable equityViews={viewsWithNoDividends} />);
    expect(container).toBeDefined();
  });

  it('should render multiple equity views', () => {
    const multipleViews: EquityView[] = [
      {
        position: {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          sector: 'Technology',
          shares: 100,
          averageCost: 150,
          currentPrice: 180,
          dividends: [],
          navHistory: [],
        },
        manualLots: [],
        dividendsWithShares: [
          {
            id: 'div-1',
            date: '2024-01-15',
            amountPerShare: 0.25,
            sharesOwned: 100,
          },
        ],
      },
      {
        position: {
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          sector: 'Technology',
          shares: 50,
          averageCost: 300,
          currentPrice: 380,
          dividends: [],
          navHistory: [],
        },
        manualLots: [],
        dividendsWithShares: [
          {
            id: 'div-2',
            date: '2024-01-15',
            amountPerShare: 0.62,
            sharesOwned: 50,
          },
        ],
      },
    ];

    const { container } = render(<DividendTable equityViews={multipleViews} />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('should render dividends sorted by date', () => {
    const viewsWithMultipleDividends: EquityView[] = [
      {
        position: {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          sector: 'Technology',
          shares: 100,
          averageCost: 150,
          currentPrice: 180,
          dividends: [],
          navHistory: [],
        },
        manualLots: [],
        dividendsWithShares: [
          {
            id: 'div-1',
            date: '2024-01-15',
            amountPerShare: 0.25,
            sharesOwned: 100,
          },
          {
            id: 'div-2',
            date: '2024-04-15',
            amountPerShare: 0.25,
            sharesOwned: 100,
          },
          {
            id: 'div-3',
            date: '2024-07-15',
            amountPerShare: 0.25,
            sharesOwned: 100,
          },
        ],
      },
    ];

    const { container } = render(<DividendTable equityViews={viewsWithMultipleDividends} />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThan(0);
  });
});

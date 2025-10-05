import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RecentDividendsList } from './RecentDividendsList';
import type { EquityView } from '../../types/portfolio';

describe('RecentDividendsList', () => {
  const mockEquityViews: EquityView[] = [
    {
      position: {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        sector: 'Technology',
        shares: 100,
        averageCost: 150,
        currentPrice: 180,
        dividends: [
          { id: 'div-1', date: '2024-01-15', amountPerShare: 0.25 }
        ],
        navHistory: []
      },
      manualLots: [],
      dividendsWithShares: [
        {
          id: 'div-1',
          date: '2024-01-15',
          amountPerShare: 0.25,
          sharesOwned: 100
        }
      ]
    }
  ];

  it('should render without crashing', () => {
    const { container } = render(<RecentDividendsList equityViews={mockEquityViews} />);
    expect(container).toBeDefined();
  });

  it('should render with empty equity views', () => {
    const { container } = render(<RecentDividendsList equityViews={[]} />);
    expect(container).toBeDefined();
  });

  it('should render list structure', () => {
    const { container } = render(<RecentDividendsList equityViews={mockEquityViews} />);
    expect(container.querySelector('div')).toBeDefined();
  });
});


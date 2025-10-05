import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { EquityPerformanceTable } from './EquityPerformanceTable';
import type { EquityView } from '../../types/portfolio';

describe('EquityPerformanceTable', () => {
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
        navHistory: []
      },
      manualLots: [],
      dividendsWithShares: []
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
        navHistory: []
      },
      manualLots: [],
      dividendsWithShares: []
    }
  ];

  it('should render without crashing', () => {
    const { container } = render(<EquityPerformanceTable equityViews={mockEquityViews} />);
    expect(container).toBeDefined();
  });

  it('should render with empty equity views', () => {
    const { container } = render(<EquityPerformanceTable equityViews={[]} />);
    expect(container).toBeDefined();
  });

  it('should render table structure', () => {
    const { container } = render(<EquityPerformanceTable equityViews={mockEquityViews} />);
    const table = container.querySelector('table');
    expect(table).toBeDefined();
  });

  it('should render performance data', () => {
    const { container } = render(<EquityPerformanceTable equityViews={mockEquityViews} />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThan(0);
  });
});


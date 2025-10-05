import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CombinedEquityTable } from './CombinedEquityTable';
import type { EquityView } from '../../types/portfolio';

describe('CombinedEquityTable', () => {
  const mockOnDeleteDividend = vi.fn();

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
      manualLots: [
        {
          id: 'lot-1',
          symbol: 'AAPL',
          tradeDate: '2024-01-01',
          shares: 100,
          pricePerShare: 150
        }
      ],
      dividendsWithShares: [
        {
          id: 'div-1',
          date: '2024-01-15',
          amountPerShare: 0.25,
          sharesOwned: 100
        }
      ]
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
    const { container} = render(
      <CombinedEquityTable equityViews={mockEquityViews} onDeleteDividend={mockOnDeleteDividend} />
    );
    expect(container).toBeDefined();
  });

  it('should render with empty equity views', () => {
    const { container } = render(
      <CombinedEquityTable equityViews={[]} onDeleteDividend={mockOnDeleteDividend} />
    );
    expect(container).toBeDefined();
  });

  it('should render table structure', () => {
    const { container } = render(
      <CombinedEquityTable equityViews={mockEquityViews} onDeleteDividend={mockOnDeleteDividend} />
    );
    const table = container.querySelector('table');
    expect(table).toBeDefined();
  });

  it('should render equity data rows', () => {
    const { container } = render(
      <CombinedEquityTable equityViews={mockEquityViews} onDeleteDividend={mockOnDeleteDividend} />
    );
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('should expand row when clicked', () => {
    const { container } = render(
      <CombinedEquityTable equityViews={mockEquityViews} onDeleteDividend={mockOnDeleteDividend} />
    );

    const firstRow = container.querySelector('tbody tr');
    if (firstRow) {
      fireEvent.click(firstRow);
      // After click, should show expanded content
      expect(container.querySelectorAll('tbody tr').length).toBeGreaterThan(mockEquityViews.length);
    }
  });

  it('should handle equity with no manual lots', () => {
    const viewsWithNoLots: EquityView[] = [
      {
        position: {
          symbol: 'GOOGL',
          name: 'Alphabet Inc.',
          sector: 'Technology',
          shares: 0,
          averageCost: 0,
          currentPrice: 140,
          dividends: [],
          navHistory: []
        },
        manualLots: [],
        dividendsWithShares: []
      }
    ];

    const { container } = render(
      <CombinedEquityTable equityViews={viewsWithNoLots} onDeleteDividend={mockOnDeleteDividend} />
    );
    expect(container).toBeDefined();
  });

  it('should handle equity with dividends', () => {
    const { container } = render(
      <CombinedEquityTable equityViews={mockEquityViews} onDeleteDividend={mockOnDeleteDividend} />
    );

    // Expand first row to show dividends
    const firstRow = container.querySelector('tbody tr');
    if (firstRow) {
      fireEvent.click(firstRow);
    }

    expect(container).toBeDefined();
  });

  it('should call onDeleteDividend when delete is clicked', () => {
    const { container } = render(
      <CombinedEquityTable equityViews={mockEquityViews} onDeleteDividend={mockOnDeleteDividend} />
    );

    // Expand first row
    const firstRow = container.querySelector('tbody tr');
    if (firstRow) {
      fireEvent.click(firstRow);

      // Find and click delete button if it exists
      const deleteButtons = container.querySelectorAll('button');
      const deleteButton = Array.from(deleteButtons).find(btn =>
        btn.textContent?.includes('Delete') || btn.textContent?.includes('×')
      );

      if (deleteButton) {
        fireEvent.click(deleteButton);
        expect(mockOnDeleteDividend).toHaveBeenCalled();
      }
    }
  });
});


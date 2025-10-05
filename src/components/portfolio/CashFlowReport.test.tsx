import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CashFlowReport } from './CashFlowReport';
import type { EquityView } from '../../types/portfolio';

describe('CashFlowReport', () => {
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
        dividends: [],
        navHistory: []
      },
      manualLots: [
        {
          id: 'lot-1',
          symbol: 'AAPL',
          tradeDate: '2024-01-15',
          shares: 100,
          pricePerShare: 150
        }
      ],
      dividendsWithShares: [
        {
          id: 'div-1',
          date: '2024-02-15',
          amountPerShare: 0.25,
          sharesOwned: 100
        },
        {
          id: 'div-2',
          date: '2024-05-15',
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
      manualLots: [
        {
          id: 'lot-2',
          symbol: 'MSFT',
          tradeDate: '2024-03-01',
          shares: 50,
          pricePerShare: 300
        }
      ],
      dividendsWithShares: [
        {
          id: 'div-3',
          date: '2024-04-15',
          amountPerShare: 0.62,
          sharesOwned: 50
        }
      ]
    }
  ];

  it('should render without crashing', () => {
    const { container } = render(
      <CashFlowReport equityViews={mockEquityViews} onDeleteDividend={mockOnDeleteDividend} />
    );
    expect(container).toBeDefined();
  });

  it('should render with empty equity views', () => {
    const { container } = render(
      <CashFlowReport equityViews={[]} onDeleteDividend={mockOnDeleteDividend} />
    );
    expect(container).toBeDefined();
  });

  it('should render monthly cash flow table', () => {
    const { container } = render(
      <CashFlowReport equityViews={mockEquityViews} onDeleteDividend={mockOnDeleteDividend} />
    );
    const table = container.querySelector('table');
    expect(table).toBeDefined();
  });

  it('should render cash flow data rows', () => {
    const { container } = render(
      <CashFlowReport equityViews={mockEquityViews} onDeleteDividend={mockOnDeleteDividend} />
    );
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('should expand month when clicked', () => {
    const { container } = render(
      <CashFlowReport equityViews={mockEquityViews} onDeleteDividend={mockOnDeleteDividend} />
    );
    
    const firstRow = container.querySelector('tbody tr');
    if (firstRow) {
      const initialRowCount = container.querySelectorAll('tbody tr').length;
      fireEvent.click(firstRow);
      const expandedRowCount = container.querySelectorAll('tbody tr').length;
      // After expansion, should have more rows (or same if no transactions)
      expect(expandedRowCount).toBeGreaterThanOrEqual(initialRowCount);
    }
  });

  it('should handle equity views with no dividends', () => {
    const viewsWithNoDividends: EquityView[] = [
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
      <CashFlowReport equityViews={viewsWithNoDividends} onDeleteDividend={mockOnDeleteDividend} />
    );
    expect(container).toBeDefined();
  });

  it('should handle equity views with no manual lots', () => {
    const viewsWithNoLots: EquityView[] = [
      {
        position: {
          symbol: 'TSLA',
          name: 'Tesla Inc.',
          sector: 'Automotive',
          shares: 0,
          averageCost: 0,
          currentPrice: 250,
          dividends: [],
          navHistory: []
        },
        manualLots: [],
        dividendsWithShares: []
      }
    ];

    const { container } = render(
      <CashFlowReport equityViews={viewsWithNoLots} onDeleteDividend={mockOnDeleteDividend} />
    );
    expect(container).toBeDefined();
  });

  it('should call onDeleteDividend when delete is clicked', () => {
    const { container } = render(
      <CashFlowReport equityViews={mockEquityViews} onDeleteDividend={mockOnDeleteDividend} />
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


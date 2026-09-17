import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';
import { CombinedEquityTable } from './CombinedEquityTable';
import { usePortfolioStore } from '../../store/portfolioStore';
import type { PortfolioSnapshot, PurchaseLot } from '../../types/portfolio';

// The component reads snapshot and customLots straight from the store, so the tests below drive it
// through usePortfolioStore.setState with a fixture whose per-column values are all distinct.
//
// Derived values per position (cost = shares * averageCost, market = shares * currentPrice):
//   AAA "Zeta Fund"     10 sh  cost 1000  market  500  P&L -500  div  0  return -500  peak 50  nav 50  erosion  0%
//   BBB "Alpha Income"  50 sh  cost 1200  market 1500  P&L  300  div 55  return  355  peak 40  nav 30  erosion 25%
//   CCC "Mid Growth"    30 sh  cost 1500  market 2100  P&L  600  div 36  return  636  peak 72  nav 70  erosion  2.8%
// Default sort is name ascending, which yields BBB, CCC, AAA (not symbol order).
const threePositions: PortfolioSnapshot = {
  asOf: '2025-01-15',
  seedAmount: 10000,
  seedDate: '2024-01-01',
  equityMetadata: [
    {
      symbol: 'AAA',
      name: 'Zeta Fund',
      sector: 'Energy',
      shares: 10,
      averageCost: 100,
      currentPrice: 50,
      dividends: [],
      navHistory: [],
    },
    {
      symbol: 'BBB',
      name: 'Alpha Income',
      sector: 'Utilities',
      shares: 50,
      averageCost: 24,
      currentPrice: 30,
      dividends: [
        { id: 'bbb-2024-03', date: '2024-03-01', amountPerShare: 0.5 },
        { id: 'bbb-2024-06', date: '2024-06-01', amountPerShare: 0.6 },
      ],
      navHistory: [
        { date: '2024-01-01', value: 40 },
        { date: '2024-06-01', value: 30 },
      ],
    },
    {
      symbol: 'CCC',
      name: 'Mid Growth',
      sector: 'Technology',
      shares: 30,
      averageCost: 50,
      currentPrice: 70,
      dividends: [{ id: 'ccc-2024-02', date: '2024-02-01', amountPerShare: 1.2 }],
      navHistory: [
        { date: '2024-01-01', value: 55 },
        { date: '2024-04-01', value: 72 },
        { date: '2024-07-01', value: 70 },
      ],
    },
  ],
};

const DEFAULT_ORDER = ['BBB', 'CCC', 'AAA'];

const setStore = (snapshot: PortfolioSnapshot, customLots: PurchaseLot[] = []) => {
  usePortfolioStore.setState({ snapshot, customLots });
};

const rowSymbols = (container: HTMLElement): string[] =>
  Array.from(
    container.querySelectorAll(
      'tbody > tr:not(.dividend-details-row) > td:first-child .table-cell__meta'
    )
  ).map(el => el.textContent ?? '');

const headerCell = (container: HTMLElement, label: string): HTMLTableCellElement => {
  const cell = Array.from(container.querySelectorAll('table.data-table > thead th')).find(th =>
    (th.textContent ?? '').trim().startsWith(label)
  );
  if (!cell) throw new Error(`No column header starting with "${label}"`);
  return cell as HTMLTableCellElement;
};

const dataRow = (container: HTMLElement, symbol: string): HTMLTableRowElement => {
  const meta = Array.from(
    container.querySelectorAll('tbody > tr > td:first-child .table-cell__meta')
  ).find(el => el.textContent === symbol);
  const row = meta?.closest('tr');
  if (!row) throw new Error(`No data row for ${symbol}`);
  return row as HTMLTableRowElement;
};

const detailsRows = (container: HTMLElement) =>
  container.querySelectorAll('tbody > tr.dividend-details-row');

const portfolioTotalCells = (container: HTMLElement): HTMLTableCellElement[] =>
  Array.from(container.querySelectorAll('table.data-table > tfoot > tr > td'));

// Body rows of the nested dividend history table as arrays of cell text. The nested table lives
// inside the outer table's tbody, so a descendant selector like 'tbody tr' would also match its
// thead and tfoot rows; the table's own section properties avoid that.
const historyRows = (history: HTMLTableElement): string[][] =>
  Array.from(history.tBodies[0].rows).map(tr =>
    Array.from(tr.cells).map(td => td.textContent ?? '')
  );

// Column indexes in a data row.
const COL = {
  symbol: 0,
  shares: 1,
  marketValue: 2,
  costBasis: 3,
  unrealizedPnL: 4,
  totalReturn: 5,
  roi: 6,
  navPeak: 7,
  currentNav: 8,
  navErosion: 9,
  dividendIncome: 10,
  yieldOnCost: 11,
  lastPayment: 12,
} as const;

// Column indexes in the Portfolio Total row (the first cell spans two columns).
const TOTAL_COL = {
  label: 0,
  marketValue: 1,
  costBasis: 2,
  unrealizedPnL: 3,
  totalReturn: 4,
  roi: 5,
  dividendIncome: 9,
  yieldOnCost: 10,
} as const;

describe('CombinedEquityTable with store state', () => {
  beforeEach(() => {
    setStore(threePositions);
  });

  describe('rows', () => {
    it('renders one row per position with name and symbol, sorted by name by default', () => {
      const { container } = render(<CombinedEquityTable />);
      expect(rowSymbols(container)).toEqual(DEFAULT_ORDER);
      const names = Array.from(container.querySelectorAll('.table-cell__main')).map(
        el => el.textContent
      );
      expect(names).toEqual(['Alpha Income', 'Mid Growth', 'Zeta Fund']);
      expect(headerCell(container, 'Symbol').textContent).toContain('▲');
    });

    it('renders every column header once', () => {
      const { container } = render(<CombinedEquityTable />);
      const headers = Array.from(container.querySelectorAll('table.data-table > thead th')).map(
        th => (th.textContent ?? '').replace(/[▲▼]/g, '').trim()
      );
      expect(headers).toEqual([
        'Symbol',
        'Shares',
        'Market Value',
        'Cost Basis',
        'Unrealized P&L',
        'Total Return',
        'ROI',
        'NAV Peak',
        'Current NAV',
        'NAV Erosion',
        'Dividend Income',
        'Yield on Cost',
        'Last Payment',
      ]);
    });

    it('shows shares, market value and cost basis from the fixture', () => {
      const { container } = render(<CombinedEquityTable />);
      const cells = dataRow(container, 'BBB').cells;
      expect(cells[COL.shares]).toHaveTextContent('50');
      expect(cells[COL.marketValue]).toHaveTextContent('$1,500.00');
      expect(cells[COL.costBasis]).toHaveTextContent('$1,200.00');
      expect(cells[COL.dividendIncome]).toHaveTextContent('$55.00');
    });

    it('shows the last payment amount and date for a position with dividends', () => {
      const { container } = render(<CombinedEquityTable />);
      const lastPayment = dataRow(container, 'BBB').cells[COL.lastPayment];
      expect(lastPayment).toHaveTextContent('$30.00');
      expect(lastPayment).toHaveTextContent('Jun 1, 2024');
      expect(lastPayment).not.toHaveTextContent('No payouts');
    });

    it('shows "No payouts" for a position without dividends', () => {
      const { container } = render(<CombinedEquityTable />);
      const lastPayment = dataRow(container, 'AAA').cells[COL.lastPayment];
      expect(lastPayment).toHaveTextContent('No payouts');
      expect(lastPayment.querySelector('.table-cell__meta')).not.toBeNull();
    });

    it('falls back to the current price for NAV peak and current NAV when there is no NAV history', () => {
      const { container } = render(<CombinedEquityTable />);
      const cells = dataRow(container, 'AAA').cells;
      expect(cells[COL.navPeak]).toHaveTextContent('$50.00');
      expect(cells[COL.currentNav]).toHaveTextContent('$50.00');
      expect(cells[COL.navErosion]).toHaveTextContent('0.0%');
    });

    it('uses the NAV history for peak and current NAV when present', () => {
      const { container } = render(<CombinedEquityTable />);
      const cells = dataRow(container, 'BBB').cells;
      expect(cells[COL.navPeak]).toHaveTextContent('$40.00');
      expect(cells[COL.currentNav]).toHaveTextContent('$30.00');
      expect(cells[COL.navErosion]).toHaveTextContent('25.0%');
    });

    it('hides positions with zero shares', () => {
      setStore({
        ...threePositions,
        equityMetadata: [
          ...threePositions.equityMetadata,
          {
            symbol: 'ZERO',
            name: 'Sold Out',
            sector: 'Energy',
            shares: 0,
            averageCost: 10,
            currentPrice: 12,
            dividends: [{ id: 'zero-1', date: '2024-01-01', amountPerShare: 1 }],
            navHistory: [],
          },
        ],
      });
      const { container } = render(<CombinedEquityTable />);
      expect(rowSymbols(container)).toEqual(DEFAULT_ORDER);
      expect(container.textContent).not.toContain('Sold Out');
    });
  });

  describe('sorting', () => {
    const sortCases: Array<{ label: string; asc: string[] }> = [
      { label: 'Shares', asc: ['AAA', 'CCC', 'BBB'] },
      { label: 'Market Value', asc: ['AAA', 'BBB', 'CCC'] },
      { label: 'Cost Basis', asc: ['AAA', 'BBB', 'CCC'] },
      { label: 'Unrealized P&L', asc: ['AAA', 'BBB', 'CCC'] },
      { label: 'Total Return', asc: ['AAA', 'BBB', 'CCC'] },
      { label: 'ROI', asc: ['AAA', 'BBB', 'CCC'] },
      { label: 'NAV Peak', asc: ['BBB', 'AAA', 'CCC'] },
      { label: 'Current NAV', asc: ['BBB', 'AAA', 'CCC'] },
      { label: 'NAV Erosion', asc: ['AAA', 'CCC', 'BBB'] },
      { label: 'Dividend Income', asc: ['AAA', 'CCC', 'BBB'] },
      { label: 'Yield on Cost', asc: ['AAA', 'CCC', 'BBB'] },
      { label: 'Last Payment', asc: ['AAA', 'BBB', 'CCC'] },
    ];

    it.each(sortCases)('sorts by $label ascending, then descending', ({ label, asc }) => {
      const { container } = render(<CombinedEquityTable />);
      expect(rowSymbols(container)).toEqual(DEFAULT_ORDER);

      const header = headerCell(container, label);
      fireEvent.click(header);
      expect(rowSymbols(container)).toEqual(asc);
      expect(header.textContent).toContain('▲');
      expect(header.textContent).not.toContain('▼');

      fireEvent.click(header);
      expect(rowSymbols(container)).toEqual([...asc].reverse());
      expect(header.textContent).toContain('▼');
      expect(header.textContent).not.toContain('▲');
    });

    it('flips the default name sort to descending and back', () => {
      const { container } = render(<CombinedEquityTable />);
      const header = headerCell(container, 'Symbol');

      fireEvent.click(header);
      expect(rowSymbols(container)).toEqual(['AAA', 'CCC', 'BBB']);
      expect(header.textContent).toContain('▼');

      fireEvent.click(header);
      expect(rowSymbols(container)).toEqual(DEFAULT_ORDER);
      expect(header.textContent).toContain('▲');
    });

    it('only marks the active sort column and resets to ascending when the column changes', () => {
      const { container } = render(<CombinedEquityTable />);
      const shares = headerCell(container, 'Shares');
      const marketValue = headerCell(container, 'Market Value');

      fireEvent.click(shares);
      fireEvent.click(shares);
      expect(shares.textContent).toContain('▼');
      expect(rowSymbols(container)).toEqual(['BBB', 'CCC', 'AAA']);

      fireEvent.click(marketValue);
      expect(rowSymbols(container)).toEqual(['AAA', 'BBB', 'CCC']);
      expect(marketValue.textContent).toContain('▲');
      expect(shares.textContent).not.toMatch(/[▲▼]/);
      expect(headerCell(container, 'Symbol').textContent).not.toMatch(/[▲▼]/);
    });

    it('sorts positions without a payout first when sorting by last payment ascending', () => {
      const { container } = render(<CombinedEquityTable />);
      fireEvent.click(headerCell(container, 'Last Payment'));
      expect(rowSymbols(container)[0]).toBe('AAA');
      fireEvent.click(headerCell(container, 'Last Payment'));
      expect(rowSymbols(container)[2]).toBe('AAA');
    });

    it('keeps tied rows in symbol order in both directions', () => {
      const [aaa, bbb, ccc] = threePositions.equityMetadata;
      setStore({ ...threePositions, equityMetadata: [{ ...aaa, shares: ccc.shares }, bbb, ccc] });
      const { container } = render(<CombinedEquityTable />);
      const header = headerCell(container, 'Shares');

      fireEvent.click(header);
      expect(rowSymbols(container)).toEqual(['AAA', 'CCC', 'BBB']);

      fireEvent.click(header);
      expect(rowSymbols(container)).toEqual(['BBB', 'AAA', 'CCC']);
    });
  });

  describe('expand and collapse', () => {
    it('renders no details rows until a row is clicked', () => {
      const { container } = render(<CombinedEquityTable />);
      expect(detailsRows(container)).toHaveLength(0);
      container.querySelectorAll('tbody > tr').forEach(row => {
        expect(row).not.toHaveClass('expanded-row');
        expect(row.querySelector('td:first-child span')).toHaveTextContent('▶');
      });
    });

    it('expands the clicked row and shows its performance metrics', () => {
      const { container } = render(<CombinedEquityTable />);
      const row = dataRow(container, 'BBB');
      fireEvent.click(row);

      expect(row).toHaveClass('expanded-row');
      expect(row.querySelector('td:first-child span')).toHaveTextContent('▼');
      expect(detailsRows(container)).toHaveLength(1);

      const details = within(detailsRows(container)[0] as HTMLElement);
      expect(details.getByText('Performance Metrics')).toBeInTheDocument();
      expect(details.getByText('Sector:').nextElementSibling).toHaveTextContent('Utilities');
      expect(details.getByText('NAV Peak:').nextElementSibling).toHaveTextContent('$40.00');
      expect(details.getByText('Current NAV:').nextElementSibling).toHaveTextContent('$30.00');
      expect(details.getByText('NAV Decay:').nextElementSibling).toHaveTextContent('25.0%');
      expect(details.getByText('Unrealized Gain/Loss:').nextElementSibling).toHaveTextContent(
        '$300.00'
      );
      expect(
        details.getByText('Total Return (incl. dividends):').nextElementSibling
      ).toHaveTextContent('$355.00');
    });

    it('lists dividend history newest first with per-payment totals and a total row', () => {
      const { container } = render(<CombinedEquityTable />);
      fireEvent.click(dataRow(container, 'BBB'));

      const details = within(detailsRows(container)[0] as HTMLElement);
      expect(details.getByText('Dividend History (2 payments)')).toBeInTheDocument();

      const history = details.getByRole('table') as HTMLTableElement;
      const headers = Array.from(history.tHead!.rows[0].cells).map(th => th.textContent);
      expect(headers).toEqual(['Date', 'Shares', 'Per Share', 'Total']);

      expect(historyRows(history)).toEqual([
        ['Jun 1, 2024', '50.00', '$0.60', '$30.00'],
        ['Mar 1, 2024', '50.00', '$0.50', '$25.00'],
      ]);

      const footer = history.tFoot!.rows[0];
      expect(footer.cells[0]).toHaveTextContent('Total');
      expect(footer.cells[0].colSpan).toBe(3);
      expect(footer.cells[1]).toHaveTextContent('$55.00');
    });

    it('shows an empty dividend history message for a position with no payouts', () => {
      const { container } = render(<CombinedEquityTable />);
      fireEvent.click(dataRow(container, 'AAA'));

      const details = within(detailsRows(container)[0] as HTMLElement);
      expect(details.getByText('Dividend History (0 payments)')).toBeInTheDocument();
      expect(details.getByText('No dividend history available')).toBeInTheDocument();
      expect(details.queryByRole('table')).toBeNull();
      expect(details.getByText('Sector:').nextElementSibling).toHaveTextContent('Energy');
    });

    it('collapses the row when clicked again', () => {
      const { container } = render(<CombinedEquityTable />);
      const row = dataRow(container, 'CCC');

      fireEvent.click(row);
      expect(detailsRows(container)).toHaveLength(1);

      fireEvent.click(row);
      expect(detailsRows(container)).toHaveLength(0);
      expect(row).not.toHaveClass('expanded-row');
      expect(row.querySelector('td:first-child span')).toHaveTextContent('▶');
    });

    it('keeps only one row expanded at a time', () => {
      const { container } = render(<CombinedEquityTable />);
      fireEvent.click(dataRow(container, 'BBB'));
      fireEvent.click(dataRow(container, 'CCC'));

      expect(detailsRows(container)).toHaveLength(1);
      expect(dataRow(container, 'BBB')).not.toHaveClass('expanded-row');
      expect(dataRow(container, 'CCC')).toHaveClass('expanded-row');

      const details = within(detailsRows(container)[0] as HTMLElement);
      expect(details.getByText('Sector:').nextElementSibling).toHaveTextContent('Technology');
      // The heading currently reads "1 payments". Accept either wording so a pluralization fix in
      // the component does not break this test.
      expect(details.getByText(/^Dividend History \(1 payments?\)$/)).toBeInTheDocument();
    });

    it('places the details row directly under its parent row and spans all columns', () => {
      const { container } = render(<CombinedEquityTable />);
      const row = dataRow(container, 'BBB');
      fireEvent.click(row);

      const details = row.nextElementSibling as HTMLTableRowElement;
      expect(details).toHaveClass('dividend-details-row');
      expect(details.cells).toHaveLength(1);
      expect(details.cells[0].colSpan).toBe(13);
    });

    it('keeps the expanded row open while re-sorting', () => {
      const { container } = render(<CombinedEquityTable />);
      fireEvent.click(dataRow(container, 'AAA'));
      fireEvent.click(headerCell(container, 'Shares'));

      expect(rowSymbols(container)).toEqual(['AAA', 'CCC', 'BBB']);
      expect(dataRow(container, 'AAA')).toHaveClass('expanded-row');
      expect(dataRow(container, 'AAA').nextElementSibling).toHaveClass('dividend-details-row');
    });
  });

  describe('conditional formatting', () => {
    it('marks losses negative and gains positive in the data rows', () => {
      const { container } = render(<CombinedEquityTable />);
      const loss = dataRow(container, 'AAA').cells;
      const gain = dataRow(container, 'BBB').cells;

      [COL.unrealizedPnL, COL.totalReturn, COL.roi].forEach(index => {
        expect(loss[index]).toHaveClass('value-negative');
        expect(loss[index]).not.toHaveClass('value-positive');
        expect(gain[index]).toHaveClass('value-positive');
        expect(gain[index]).not.toHaveClass('value-negative');
      });
      expect(loss[COL.unrealizedPnL]).toHaveTextContent('-$500.00');
      expect(loss[COL.roi]).toHaveTextContent('-50.0%');
      expect(gain[COL.unrealizedPnL]).toHaveTextContent('$300.00');
    });

    it('marks NAV erosion positive at zero and negative once the NAV has dropped', () => {
      const { container } = render(<CombinedEquityTable />);
      expect(dataRow(container, 'AAA').cells[COL.navErosion]).toHaveClass('value-positive');
      expect(dataRow(container, 'BBB').cells[COL.navErosion]).toHaveClass('value-negative');
      expect(dataRow(container, 'CCC').cells[COL.navErosion]).toHaveClass('value-negative');
    });

    it('applies the same sign classes inside the expanded panel', () => {
      const { container } = render(<CombinedEquityTable />);

      fireEvent.click(dataRow(container, 'AAA'));
      let details = within(detailsRows(container)[0] as HTMLElement);
      expect(details.getByText('NAV Decay:').nextElementSibling).toHaveClass('value-positive');
      expect(details.getByText('Unrealized Gain/Loss:').nextElementSibling).toHaveClass(
        'value-negative'
      );
      expect(details.getByText('Total Return (incl. dividends):').nextElementSibling).toHaveClass(
        'value-negative'
      );

      fireEvent.click(dataRow(container, 'BBB'));
      details = within(detailsRows(container)[0] as HTMLElement);
      expect(details.getByText('NAV Decay:').nextElementSibling).toHaveClass('value-negative');
      expect(details.getByText('Unrealized Gain/Loss:').nextElementSibling).toHaveClass(
        'value-positive'
      );
      expect(details.getByText('Total Return (incl. dividends):').nextElementSibling).toHaveClass(
        'value-positive'
      );
    });
  });

  describe('portfolio total row', () => {
    it('sums market value, cost basis and dividend income across rows', () => {
      const { container } = render(<CombinedEquityTable />);
      const cells = portfolioTotalCells(container);
      expect(cells[TOTAL_COL.label]).toHaveTextContent('Portfolio Total');
      expect(cells[TOTAL_COL.label].colSpan).toBe(2);
      expect(cells[TOTAL_COL.marketValue]).toHaveTextContent('$4,100.00');
      expect(cells[TOTAL_COL.costBasis]).toHaveTextContent('$3,700.00');
      expect(cells[TOTAL_COL.unrealizedPnL]).toHaveTextContent('$400.00');
      expect(cells[TOTAL_COL.totalReturn]).toHaveTextContent('$491.00');
      expect(cells[TOTAL_COL.dividendIncome]).toHaveTextContent('$91.00');
      expect(cells[TOTAL_COL.roi]).toHaveTextContent('%');
      expect(cells[TOTAL_COL.yieldOnCost]).toHaveTextContent('%');
    });

    it('marks positive totals positive', () => {
      const { container } = render(<CombinedEquityTable />);
      const cells = portfolioTotalCells(container);
      expect(cells[TOTAL_COL.unrealizedPnL]).toHaveClass('value-positive');
      expect(cells[TOTAL_COL.totalReturn]).toHaveClass('value-positive');
    });

    it('marks negative totals negative when the portfolio is under water', () => {
      setStore({ ...threePositions, equityMetadata: [threePositions.equityMetadata[0]] });
      const { container } = render(<CombinedEquityTable />);
      const cells = portfolioTotalCells(container);
      expect(cells[TOTAL_COL.unrealizedPnL]).toHaveTextContent('-$500.00');
      expect(cells[TOTAL_COL.unrealizedPnL]).toHaveClass('value-negative');
      expect(cells[TOTAL_COL.totalReturn]).toHaveTextContent('-$500.00');
      expect(cells[TOTAL_COL.totalReturn]).toHaveClass('value-negative');
      expect(cells[TOTAL_COL.roi]).toHaveTextContent('-50.0%');
      expect(cells[TOTAL_COL.yieldOnCost]).toHaveTextContent('0.0%');
    });

    it('does not change when the rows are re-sorted', () => {
      const { container } = render(<CombinedEquityTable />);
      const before = portfolioTotalCells(container).map(td => td.textContent);
      fireEvent.click(headerCell(container, 'Total Return'));
      fireEvent.click(headerCell(container, 'Total Return'));
      expect(portfolioTotalCells(container).map(td => td.textContent)).toEqual(before);
    });
  });

  describe('empty and lot-only portfolios', () => {
    it('renders headers and a zeroed total row with dashes for ratios when there are no positions', () => {
      setStore({ ...threePositions, equityMetadata: [] });
      const { container } = render(<CombinedEquityTable />);

      expect(container.querySelectorAll('tbody > tr')).toHaveLength(0);
      expect(container.querySelectorAll('table.data-table > thead th')).toHaveLength(13);

      const cells = portfolioTotalCells(container);
      expect(cells[TOTAL_COL.label]).toHaveTextContent('Portfolio Total');
      expect(cells[TOTAL_COL.marketValue]).toHaveTextContent('$0.00');
      expect(cells[TOTAL_COL.costBasis]).toHaveTextContent('$0.00');
      expect(cells[TOTAL_COL.unrealizedPnL]).toHaveTextContent('$0.00');
      expect(cells[TOTAL_COL.unrealizedPnL]).toHaveClass('value-positive');
      expect(cells[TOTAL_COL.dividendIncome]).toHaveTextContent('$0.00');
      expect(cells[TOTAL_COL.roi]).toHaveTextContent('—');
      expect(cells[TOTAL_COL.yieldOnCost]).toHaveTextContent('—');
    });

    it('renders a lot-only symbol as a manual entry with no NAV history or dividends', () => {
      setStore({ ...threePositions, equityMetadata: [] }, [
        { id: 'lot-ddd-1', symbol: 'DDD', tradeDate: '2024-01-10', shares: 5, pricePerShare: 10 },
        { id: 'lot-ddd-2', symbol: 'DDD', tradeDate: '2024-02-10', shares: 5, pricePerShare: 12 },
      ]);
      const { container } = render(<CombinedEquityTable />);

      expect(rowSymbols(container)).toEqual(['DDD']);
      const cells = dataRow(container, 'DDD').cells;
      expect(cells[COL.symbol].querySelector('.table-cell__main')).toHaveTextContent('DDD');
      expect(cells[COL.shares]).toHaveTextContent('10');
      expect(cells[COL.dividendIncome]).toHaveTextContent('$0.00');
      expect(cells[COL.lastPayment]).toHaveTextContent('No payouts');
      // Current price for a lot-only symbol is the latest lot price, and there is no NAV history.
      expect(cells[COL.navPeak]).toHaveTextContent('$12.00');
      expect(cells[COL.currentNav]).toHaveTextContent('$12.00');

      fireEvent.click(dataRow(container, 'DDD'));
      const details = within(detailsRows(container)[0] as HTMLElement);
      expect(details.getByText('Sector:').nextElementSibling).toHaveTextContent('Manual Entry');
      expect(details.getByText('No dividend history available')).toBeInTheDocument();
    });

    it('counts dividends with the shares held on each payment date when shares come from lots', () => {
      setStore(
        {
          ...threePositions,
          equityMetadata: [
            {
              symbol: 'EEE',
              name: 'Lot Backed',
              sector: 'Financials',
              shares: 0,
              averageCost: 0,
              currentPrice: 20,
              dividends: [
                { id: 'eee-before', date: '2024-01-05', amountPerShare: 1 },
                { id: 'eee-first', date: '2024-03-05', amountPerShare: 0.25 },
                { id: 'eee-second', date: '2024-06-05', amountPerShare: 0.25 },
              ],
              navHistory: [],
            },
          ],
        },
        [
          {
            id: 'lot-eee-1',
            symbol: 'EEE',
            tradeDate: '2024-02-01',
            shares: 100,
            pricePerShare: 15,
          },
          {
            id: 'lot-eee-2',
            symbol: 'EEE',
            tradeDate: '2024-05-01',
            shares: 100,
            pricePerShare: 18,
          },
        ]
      );
      const { container } = render(<CombinedEquityTable />);

      const cells = dataRow(container, 'EEE').cells;
      expect(cells[COL.shares]).toHaveTextContent('200');
      // The payment before the first lot is dropped; 100 sh * 0.25 + 200 sh * 0.25 = 75.
      expect(cells[COL.dividendIncome]).toHaveTextContent('$75.00');
      expect(cells[COL.lastPayment]).toHaveTextContent('$50.00');
      expect(cells[COL.lastPayment]).toHaveTextContent('Jun 5, 2024');

      fireEvent.click(dataRow(container, 'EEE'));
      const details = within(detailsRows(container)[0] as HTMLElement);
      expect(details.getByText('Dividend History (2 payments)')).toBeInTheDocument();
      const history = details.getByRole('table') as HTMLTableElement;
      expect(historyRows(history)).toEqual([
        ['Jun 5, 2024', '200.00', '$0.25', '$50.00'],
        ['Mar 5, 2024', '100.00', '$0.25', '$25.00'],
      ]);
      expect(history.tFoot).toHaveTextContent('$75.00');
    });
  });
});

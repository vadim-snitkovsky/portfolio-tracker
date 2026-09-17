import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../utils/storage', () => ({
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
    updatedAt: new Date().toISOString(),
  })),
  loadPortfolioById: () => null,
  deletePortfolio: () => true,
  renamePortfolio: () => true,
  getPortfolioMetadataList: () => [],
}));

import { EquityHoldingsManager } from './EquityHoldingsManager';
import { usePortfolioStore } from '../../store/portfolioStore';
import type { EquityPosition, PurchaseLot } from '../../types/portfolio';

const emptySnapshot = {
  asOf: '2025-01-15',
  seedAmount: 10000,
  equityMetadata: [] as EquityPosition[],
};

// AAPL: 10 shares at $10 plus 10 shares at $20 blends to 20 shares at $15 ($300).
// MSFT: 5 shares at $50 ($250). Summary line: 25 shares, $550 cost basis.
const aaplJan: PurchaseLot = {
  id: 'lot-aapl-jan',
  symbol: 'AAPL',
  tradeDate: '2024-01-01',
  shares: 10,
  pricePerShare: 10,
  fundingSource: 'seed',
};
const aaplMar: PurchaseLot = {
  id: 'lot-aapl-mar',
  symbol: 'AAPL',
  tradeDate: '2024-03-01',
  shares: 10,
  pricePerShare: 20,
  fundingSource: 'dividend',
};
const msftFeb: PurchaseLot = {
  id: 'lot-msft-feb',
  symbol: 'MSFT',
  tradeDate: '2024-02-01',
  shares: 5,
  pricePerShare: 50,
  fundingSource: 'external',
};
const fixtureLots: PurchaseLot[] = [aaplJan, aaplMar, msftFeb];

const FIXED_UUID = '00000000-0000-4000-8000-000000000001';
const CONFIRM_MESSAGE = 'Remove this lot? This cannot be undone.';

const seedStore = (customLots: PurchaseLot[], equityMetadata: EquityPosition[] = []) => {
  usePortfolioStore.setState({
    customLots,
    snapshot: { ...emptySnapshot, equityMetadata },
  });
};

const snapshotPosition = (overrides: Partial<EquityPosition>): EquityPosition => ({
  symbol: 'GOOG',
  name: 'Alphabet Inc.',
  sector: 'Technology',
  shares: 3,
  averageCost: 100,
  currentPrice: 120,
  dividends: [],
  navHistory: [],
  ...overrides,
});

const storeLots = () => usePortfolioStore.getState().customLots;
const storeLot = (id: string) => storeLots().find(lot => lot.id === id);

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const fundingSelect = () => screen.getByLabelText('Funding Source') as HTMLSelectElement;
const setField = (label: string, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

interface FormValues {
  symbol?: string;
  shares?: string;
  price?: string;
  date?: string;
  funding?: 'seed' | 'dividend' | 'external';
}

const fillForm = ({ symbol, shares, price, date, funding }: FormValues) => {
  if (symbol !== undefined) setField('Ticker Symbol', symbol);
  if (shares !== undefined) setField('Quantity', shares);
  if (price !== undefined) setField('Price per Share', price);
  if (date !== undefined) setField('Trade Date', date);
  if (funding !== undefined) setField('Funding Source', funding);
};

const validEntry: FormValues = {
  symbol: 'aapl ',
  shares: '10',
  price: '1234',
  date: '2024-05-01',
  funding: 'dividend',
};

const submitForm = (container: HTMLElement) => {
  fireEvent.submit(container.querySelector('form') as HTMLFormElement);
};

const outerTable = (container: HTMLElement) => container.querySelector('table') as HTMLTableElement;

const headerCells = (container: HTMLElement) =>
  Array.from((outerTable(container).tHead as HTMLTableSectionElement).rows[0].cells);

const symbolRows = (container: HTMLElement) =>
  Array.from(outerTable(container).tBodies[0].rows).filter(
    row => !row.classList.contains('dividend-details-row')
  );

const rowOrder = (container: HTMLElement) =>
  symbolRows(container).map(row => row.querySelector('div.table-cell__meta')?.textContent);

const symbolRow = (symbol: string) =>
  screen.getByText(symbol, { selector: 'div.table-cell__meta' }).closest('tr') as HTMLElement;

const rowCells = (row: HTMLElement) =>
  Array.from((row as HTMLTableRowElement).cells)
    .slice(1)
    .map(cell => cell.textContent);

const detailsRow = (container: HTMLElement) =>
  container.querySelector('tr.dividend-details-row') as HTMLElement | null;

const lotRows = (container: HTMLElement) => {
  const lotTable = (detailsRow(container) as HTMLElement).querySelector(
    'table'
  ) as HTMLTableElement;
  return Array.from(lotTable.tBodies[0].rows);
};

const lotRowFor = (container: HTMLElement, formattedDate: string) =>
  lotRows(container).find(row => row.cells[0].textContent === formattedDate) as HTMLTableRowElement;

const buttonIn = (row: HTMLElement, name: string) =>
  Array.from(row.querySelectorAll('button')).find(
    button => button.textContent === name
  ) as HTMLButtonElement;

const expectAddMode = () => {
  expect(screen.getByRole('button', { name: 'Add Lot' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
};

const expectEditMode = () => {
  expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
};

describe('EquityHoldingsManager', () => {
  beforeEach(() => {
    usePortfolioStore.setState({
      customLots: [],
      snapshot: {
        asOf: '2025-01-15',
        seedAmount: 10000,
        equityMetadata: [],
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
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
          pricePerShare: 150,
        },
        {
          id: 'lot-2',
          symbol: 'MSFT',
          tradeDate: '2024-02-01',
          shares: 50,
          pricePerShare: 300,
        },
      ],
      snapshot: {
        asOf: '2025-01-15',
        seedAmount: 10000,
        equityMetadata: [],
      },
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
          pricePerShare: 150,
        },
      ],
      snapshot: {
        asOf: '2025-01-15',
        seedAmount: 10000,
        equityMetadata: [],
      },
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
        equityMetadata: [],
      },
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
          pricePerShare: 150,
        },
        {
          id: 'lot-2',
          symbol: 'AAPL',
          tradeDate: '2024-02-01',
          shares: 50,
          pricePerShare: 160,
        },
        {
          id: 'lot-3',
          symbol: 'MSFT',
          tradeDate: '2024-03-01',
          shares: 25,
          pricePerShare: 300,
        },
      ],
      snapshot: {
        asOf: '2025-01-15',
        seedAmount: 10000,
        equityMetadata: [],
      },
    });

    const { container } = render(<EquityHoldingsManager />);
    expect(container.textContent).toContain('Custom lots tracked');
  });

  describe('empty state', () => {
    test('shows zero totals and no symbol rows without lots', () => {
      const { container } = render(<EquityHoldingsManager />);

      const summary = container.querySelector('.holdings-manager__summary') as HTMLElement;
      expect(summary.textContent).toContain('0 shares');
      expect(summary.textContent).toContain('Cost basis $0.00');
      expect(symbolRows(container)).toHaveLength(0);
      expect(headerCells(container).map(cell => cell.textContent?.trim())).toEqual([
        'Equity ▲',
        'Total Shares',
        'Avg Price/Share',
        'Total Cost',
      ]);
    });

    test('shows the empty lot message for a snapshot position with no manual lots', () => {
      seedStore([], [snapshotPosition({})]);
      const { container } = render(<EquityHoldingsManager />);

      fireEvent.click(symbolRow('GOOG'));

      expect(screen.getByText('No manual lots added yet.')).toBeInTheDocument();
      expect(detailsRow(container)?.querySelector('table')).toBeNull();
    });

    test('hides snapshot positions with zero shares', () => {
      seedStore([], [snapshotPosition({ symbol: 'ZERO', name: 'Zero Corp', shares: 0 })]);
      const { container } = render(<EquityHoldingsManager />);

      expect(rowOrder(container)).toEqual([]);
      expect(screen.queryByText('Zero Corp')).not.toBeInTheDocument();
    });
  });

  describe('add lot form', () => {
    test('renders every field with the three funding source options', () => {
      render(<EquityHoldingsManager />);

      expect(input('Ticker Symbol')).toHaveAttribute('placeholder', 'e.g. AAPL');
      expect(input('Ticker Symbol').value).toBe('');
      expect(input('Quantity')).toHaveAttribute('type', 'number');
      expect(input('Quantity').value).toBe('');
      expect(input('Price per Share')).toHaveAttribute('placeholder', '0.00');
      expect(input('Price per Share').value).toBe('');
      expect(input('Trade Date')).toHaveAttribute('type', 'date');
      expect(input('Trade Date').value).toBe('');

      const select = fundingSelect();
      expect(select.value).toBe('seed');
      expect(Array.from(select.options).map(option => [option.value, option.textContent])).toEqual([
        ['seed', 'Seed Capital'],
        ['dividend', 'Dividend Reinvestment'],
        ['external', 'External Deposit'],
      ]);

      expectAddMode();
      expect(screen.queryByText(/is required|must be a positive/)).not.toBeInTheDocument();
    });

    test('tracks edits to each field', () => {
      render(<EquityHoldingsManager />);

      setField('Ticker Symbol', 'msft');
      setField('Quantity', '2.5');
      setField('Trade Date', '2024-07-04');
      setField('Funding Source', 'external');

      expect(input('Ticker Symbol').value).toBe('msft');
      expect(input('Quantity').value).toBe('2.5');
      expect(input('Trade Date').value).toBe('2024-07-04');
      expect(fundingSelect().value).toBe('external');

      setField('Funding Source', 'dividend');
      expect(fundingSelect().value).toBe('dividend');
    });

    test('formats the price from digits typed as cents', () => {
      render(<EquityHoldingsManager />);
      const price = input('Price per Share');

      setField('Price per Share', '1234');
      expect(price.value).toBe('12.34');

      setField('Price per Share', '5');
      expect(price.value).toBe('0.05');

      setField('Price per Share', '12.50');
      expect(price.value).toBe('12.50');

      setField('Price per Share', 'abc');
      expect(price.value).toBe('');
    });

    describe('validation', () => {
      test.each<[string, FormValues, string]>([
        ['empty symbol', { ...validEntry, symbol: '' }, 'Symbol is required'],
        ['whitespace symbol', { ...validEntry, symbol: '   ' }, 'Symbol is required'],
        ['empty quantity', { ...validEntry, shares: '' }, 'Quantity must be a positive number'],
        ['zero quantity', { ...validEntry, shares: '0' }, 'Quantity must be a positive number'],
        [
          'negative quantity',
          { ...validEntry, shares: '-5' },
          'Quantity must be a positive number',
        ],
        ['empty price', { ...validEntry, price: '' }, 'Price per share must be a positive number'],
        ['zero price', { ...validEntry, price: '0' }, 'Price per share must be a positive number'],
        ['empty trade date', { ...validEntry, date: '' }, 'Trade date is required'],
      ])('rejects %s', (_label, values, message) => {
        const { container } = render(<EquityHoldingsManager />);

        fillForm(values);
        submitForm(container);

        const error = container.querySelector('.form-error') as HTMLElement;
        expect(error.textContent).toBe(message);
        expect(storeLots()).toEqual([]);
        expect(input('Ticker Symbol').value).toBe(values.symbol);
      });

      test('reports the first failing field only', () => {
        const { container } = render(<EquityHoldingsManager />);

        submitForm(container);

        expect(container.querySelectorAll('.form-error')).toHaveLength(1);
        expect(screen.getByText('Symbol is required')).toBeInTheDocument();
      });

      test('clears the error once a valid lot is submitted', () => {
        const { container } = render(<EquityHoldingsManager />);

        fillForm({ ...validEntry, shares: '' });
        submitForm(container);
        expect(screen.getByText('Quantity must be a positive number')).toBeInTheDocument();

        setField('Quantity', '3');
        submitForm(container);

        expect(container.querySelector('.form-error')).toBeNull();
        expect(storeLots()).toHaveLength(1);
      });
    });

    test('adds a lot with the symbol uppercased and trimmed, then clears shares and price', () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue(FIXED_UUID);
      const { container } = render(<EquityHoldingsManager />);

      fillForm(validEntry);
      submitForm(container);

      expect(storeLots()).toEqual([
        {
          id: FIXED_UUID,
          symbol: 'AAPL',
          shares: 10,
          pricePerShare: 12.34,
          tradeDate: '2024-05-01',
          fundingSource: 'dividend',
        },
      ]);

      expect(input('Ticker Symbol').value).toBe('AAPL');
      expect(input('Quantity').value).toBe('');
      expect(input('Price per Share').value).toBe('');
      expect(input('Trade Date').value).toBe('2024-05-01');
      expect(fundingSelect().value).toBe('seed');
      expect(container.querySelector('.form-error')).toBeNull();
      expectAddMode();

      expect(rowCells(symbolRow('AAPL'))).toEqual(['10', '$12.34', '$123.40']);
      expect(detailsRow(container)).not.toBeNull();
      expect(lotRows(container)).toHaveLength(1);
      expect(screen.getByText('💰 Dividend')).toBeInTheDocument();
    });

    test('submits through the Add Lot button', () => {
      render(<EquityHoldingsManager />);

      fillForm({ symbol: 'NVDA', shares: '4', price: '90000', date: '2024-08-15' });
      fireEvent.click(screen.getByRole('button', { name: 'Add Lot' }));

      expect(storeLots()).toHaveLength(1);
      expect(storeLots()[0]).toMatchObject({
        symbol: 'NVDA',
        shares: 4,
        pricePerShare: 900,
        tradeDate: '2024-08-15',
        fundingSource: 'seed',
      });
      expect(typeof storeLots()[0].id).toBe('string');
      expect(storeLots()[0].id.length).toBeGreaterThan(0);
    });

    test('keeps the symbol and trade date for the next entry', () => {
      const { container } = render(<EquityHoldingsManager />);

      fillForm({ symbol: 'aapl', shares: '1', price: '100', date: '2024-05-01' });
      submitForm(container);
      fillForm({ shares: '2', price: '200' });
      submitForm(container);

      const lots = storeLots();
      expect(lots).toHaveLength(2);
      expect(lots[1]).toMatchObject({
        symbol: 'AAPL',
        shares: 2,
        pricePerShare: 2,
        tradeDate: '2024-05-01',
      });
      expect(lots[0].id).not.toBe(lots[1].id);
      expect(rowCells(symbolRow('AAPL'))).toEqual(['3', '$1.67', '$5.00']);
    });

    test('appends lots to an existing symbol and blends the cost basis', () => {
      seedStore(fixtureLots);
      const { container } = render(<EquityHoldingsManager />);

      // AAPL is 20 shares at $15. Adding 20 shares at $25 gives 40 shares at $20.
      fillForm({ symbol: 'AAPL', shares: '20', price: '2500', date: '2024-04-01' });
      submitForm(container);

      expect(storeLots()).toHaveLength(4);
      expect(rowCells(symbolRow('AAPL'))).toEqual(['40', '$20.00', '$800.00']);
      expect(lotRows(container)).toHaveLength(3);
    });

    test('falls back to a timestamp id when crypto.randomUUID is unavailable', () => {
      vi.stubGlobal('crypto', {});
      vi.setSystemTime(new Date('2025-01-15T00:00:00Z'));
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const { container } = render(<EquityHoldingsManager />);

      fillForm(validEntry);
      submitForm(container);

      expect(storeLots()[0].id).toBe('lot-1736899200000-8');
    });
  });

  describe('grouping and totals', () => {
    beforeEach(() => {
      seedStore(fixtureLots);
    });

    test('groups lots by symbol with per-symbol share, price, and cost totals', () => {
      const { container } = render(<EquityHoldingsManager />);

      expect(rowOrder(container)).toEqual(['AAPL', 'MSFT']);
      expect(rowCells(symbolRow('AAPL'))).toEqual(['20', '$15.00', '$300.00']);
      expect(rowCells(symbolRow('MSFT'))).toEqual(['5', '$50.00', '$250.00']);
      expect(screen.getAllByText('AAPL', { selector: 'div.table-cell__main' })).toHaveLength(1);
    });

    test('shows the blended cost basis across all lots in the summary line', () => {
      const { container } = render(<EquityHoldingsManager />);

      const summary = container.querySelector('.holdings-manager__summary') as HTMLElement;
      expect(summary.textContent).toBe('Custom lots tracked:25 shares• Cost basis $550.00');
    });

    test('blends snapshot shares with manual lots but only counts lots in the summary', () => {
      // Snapshot holds 10 AAPL at $10. The single manual lot adds 10 at $20.
      seedStore(
        [aaplMar],
        [snapshotPosition({ symbol: 'AAPL', name: 'Apple Inc.', shares: 10, averageCost: 10 })]
      );
      const { container } = render(<EquityHoldingsManager />);

      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
      expect(rowCells(symbolRow('AAPL'))).toEqual(['20', '$15.00', '$300.00']);

      const summary = container.querySelector('.holdings-manager__summary') as HTMLElement;
      expect(summary.textContent).toContain('10 shares');
      expect(summary.textContent).toContain('Cost basis $200.00');
    });

    test('formats large share counts with thousands separators', () => {
      seedStore([{ ...aaplJan, shares: 12500, pricePerShare: 2 }]);
      const { container } = render(<EquityHoldingsManager />);

      // The component calls toLocaleString() with no locale, so mirror that here.
      const shares = (12500).toLocaleString();
      expect(rowCells(symbolRow('AAPL'))).toEqual([shares, '$2.00', '$25,000.00']);
      expect(container.textContent).toContain(`${shares} shares`);
    });
  });

  describe('lot details', () => {
    beforeEach(() => {
      seedStore(fixtureLots);
    });

    test('expands a symbol to list its lots newest first and collapses on a second click', () => {
      const { container } = render(<EquityHoldingsManager />);
      expect(detailsRow(container)).toBeNull();
      expect(symbolRow('AAPL').textContent).toContain('▶');

      fireEvent.click(symbolRow('AAPL'));

      expect(symbolRow('AAPL')).toHaveClass('expanded-row');
      expect(symbolRow('AAPL').textContent).toContain('▼');
      expect(symbolRow('MSFT')).not.toHaveClass('expanded-row');

      const rows = lotRows(container);
      expect(rows).toHaveLength(2);
      expect(Array.from(rows[0].cells).map(cell => cell.textContent)).toEqual([
        'Mar 1, 2024',
        '10',
        '$20.00',
        '$200.00',
        '💰 Dividend',
        'EditDelete',
      ]);
      expect(Array.from(rows[1].cells).map(cell => cell.textContent)).toEqual([
        'Jan 1, 2024',
        '10',
        '$10.00',
        '$100.00',
        '🌱 Seed',
        'EditDelete',
      ]);

      fireEvent.click(symbolRow('AAPL'));

      expect(detailsRow(container)).toBeNull();
      expect(symbolRow('AAPL')).not.toHaveClass('expanded-row');
    });

    test('only one symbol is expanded at a time', () => {
      const { container } = render(<EquityHoldingsManager />);

      fireEvent.click(symbolRow('AAPL'));
      fireEvent.click(symbolRow('MSFT'));

      expect(container.querySelectorAll('tr.dividend-details-row')).toHaveLength(1);
      expect(symbolRow('MSFT')).toHaveClass('expanded-row');
      expect(lotRows(container)).toHaveLength(1);
      expect(lotRows(container)[0].cells[0].textContent).toBe('Feb 1, 2024');
    });

    test('shows a funding badge for each source', () => {
      const { container } = render(<EquityHoldingsManager />);

      fireEvent.click(symbolRow('AAPL'));
      expect(screen.getByText('🌱 Seed')).toHaveClass('funding-badge', 'funding-badge--seed');
      expect(screen.getByText('💰 Dividend')).toHaveClass(
        'funding-badge',
        'funding-badge--dividend'
      );

      fireEvent.click(symbolRow('MSFT'));
      expect(screen.getByText('📥 External')).toHaveClass(
        'funding-badge',
        'funding-badge--external'
      );
      expect(container.querySelectorAll('.funding-badge')).toHaveLength(1);
    });

    test('treats a lot without a funding source as seed', () => {
      seedStore([{ ...msftFeb, fundingSource: undefined }]);
      render(<EquityHoldingsManager />);

      fireEvent.click(symbolRow('MSFT'));

      expect(screen.getByText('🌱 Seed')).toHaveClass('funding-badge--seed');
    });
  });

  describe('sorting', () => {
    beforeEach(() => {
      seedStore(fixtureLots);
    });

    const headerText = (container: HTMLElement) =>
      headerCells(container).map(cell => cell.textContent?.trim());

    test('sorts by name ascending by default and toggles direction on a second click', () => {
      const { container } = render(<EquityHoldingsManager />);
      const [nameHeader] = headerCells(container);

      expect(rowOrder(container)).toEqual(['AAPL', 'MSFT']);
      expect(headerText(container)[0]).toBe('Equity ▲');

      fireEvent.click(nameHeader);
      expect(rowOrder(container)).toEqual(['MSFT', 'AAPL']);
      expect(headerText(container)[0]).toBe('Equity ▼');

      fireEvent.click(nameHeader);
      expect(rowOrder(container)).toEqual(['AAPL', 'MSFT']);
      expect(headerText(container)[0]).toBe('Equity ▲');
    });

    test('sorts by total shares', () => {
      const { container } = render(<EquityHoldingsManager />);
      const sharesHeader = headerCells(container)[1];

      fireEvent.click(sharesHeader);
      expect(rowOrder(container)).toEqual(['MSFT', 'AAPL']);
      expect(headerText(container)).toEqual([
        'Equity',
        'Total Shares ▲',
        'Avg Price/Share',
        'Total Cost',
      ]);

      fireEvent.click(sharesHeader);
      expect(rowOrder(container)).toEqual(['AAPL', 'MSFT']);
      expect(headerText(container)[1]).toBe('Total Shares ▼');
    });

    test('sorts by average price per share', () => {
      const { container } = render(<EquityHoldingsManager />);
      const priceHeader = headerCells(container)[2];

      fireEvent.click(priceHeader);
      expect(rowOrder(container)).toEqual(['AAPL', 'MSFT']);
      expect(headerText(container)[2]).toBe('Avg Price/Share ▲');

      fireEvent.click(priceHeader);
      expect(rowOrder(container)).toEqual(['MSFT', 'AAPL']);
      expect(headerText(container)[2]).toBe('Avg Price/Share ▼');
    });

    test('sorts by total cost', () => {
      const { container } = render(<EquityHoldingsManager />);
      const costHeader = headerCells(container)[3];

      fireEvent.click(costHeader);
      expect(rowOrder(container)).toEqual(['MSFT', 'AAPL']);
      expect(headerText(container)[3]).toBe('Total Cost ▲');

      fireEvent.click(costHeader);
      expect(rowOrder(container)).toEqual(['AAPL', 'MSFT']);
      expect(headerText(container)[3]).toBe('Total Cost ▼');
    });

    test('switching fields resets the direction to ascending', () => {
      const { container } = render(<EquityHoldingsManager />);
      const [nameHeader, sharesHeader] = headerCells(container);

      fireEvent.click(nameHeader);
      expect(headerText(container)[0]).toBe('Equity ▼');

      fireEvent.click(sharesHeader);
      expect(headerText(container)[0]).toBe('Equity');
      expect(headerText(container)[1]).toBe('Total Shares ▲');
    });

    test('keeps the existing order for equal values', () => {
      seedStore([aaplJan, { ...msftFeb, shares: 10, pricePerShare: 10 }]);
      const { container } = render(<EquityHoldingsManager />);

      fireEvent.click(headerCells(container)[1]);
      expect(rowOrder(container)).toEqual(['AAPL', 'MSFT']);

      fireEvent.click(headerCells(container)[1]);
      expect(rowOrder(container)).toEqual(['AAPL', 'MSFT']);
    });
  });

  describe('editing a lot', () => {
    beforeEach(() => {
      seedStore(fixtureLots);
    });

    const startEditing = (container: HTMLElement, symbol: string, formattedDate: string) => {
      fireEvent.click(symbolRow(symbol));
      fireEvent.click(buttonIn(lotRowFor(container, formattedDate), 'Edit'));
    };

    test('enters edit mode with the lot values loaded into the form', () => {
      const { container } = render(<EquityHoldingsManager />);

      startEditing(container, 'AAPL', 'Jan 1, 2024');

      expect(input('Ticker Symbol').value).toBe('AAPL');
      expect(input('Quantity').value).toBe('10');
      expect(Number(input('Price per Share').value)).toBe(10);
      expect(input('Trade Date').value).toBe('2024-01-01');
      expect(fundingSelect().value).toBe('seed');
      expectEditMode();
      expect(symbolRow('AAPL')).toHaveClass('expanded-row');
    });

    test('loads the funding source of the selected lot', () => {
      const { container } = render(<EquityHoldingsManager />);

      startEditing(container, 'AAPL', 'Mar 1, 2024');
      expect(fundingSelect().value).toBe('dividend');

      fireEvent.click(buttonIn(lotRowFor(container, 'Jan 1, 2024'), 'Edit'));
      expect(fundingSelect().value).toBe('seed');
      expect(Number(input('Price per Share').value)).toBe(10);
    });

    test('defaults the funding source to seed for a lot without one', () => {
      seedStore([{ ...aaplJan, fundingSource: undefined }, aaplMar]);
      const { container } = render(<EquityHoldingsManager />);

      startEditing(container, 'AAPL', 'Jan 1, 2024');

      expect(fundingSelect().value).toBe('seed');
    });

    test('saves changes to the store and returns to add mode', () => {
      const { container } = render(<EquityHoldingsManager />);

      startEditing(container, 'AAPL', 'Jan 1, 2024');
      fillForm({ shares: '12', price: '1100', date: '2024-01-05', funding: 'external' });
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

      expect(storeLot('lot-aapl-jan')).toEqual({
        id: 'lot-aapl-jan',
        symbol: 'AAPL',
        shares: 12,
        pricePerShare: 11,
        tradeDate: '2024-01-05',
        fundingSource: 'external',
      });
      expect(storeLot('lot-aapl-mar')).toEqual(aaplMar);
      expect(storeLot('lot-msft-feb')).toEqual(msftFeb);
      expect(storeLots()).toHaveLength(3);

      expectAddMode();
      expect(input('Ticker Symbol').value).toBe('');
      expect(input('Quantity').value).toBe('');
      expect(input('Price per Share').value).toBe('');
      expect(input('Trade Date').value).toBe('');
      expect(fundingSelect().value).toBe('seed');

      // 12 at $11 plus 10 at $20 is 22 shares for $332.
      expect(rowCells(symbolRow('AAPL'))).toEqual(['22', '$15.09', '$332.00']);
      const edited = lotRowFor(container, 'Jan 5, 2024');
      expect(Array.from(edited.cells).map(cell => cell.textContent)).toEqual([
        'Jan 5, 2024',
        '12',
        '$11.00',
        '$132.00',
        '📥 External',
        'EditDelete',
      ]);
    });

    test('moves the lot to another symbol when the symbol is edited', () => {
      const { container } = render(<EquityHoldingsManager />);

      startEditing(container, 'AAPL', 'Jan 1, 2024');
      setField('Ticker Symbol', ' nvda');
      submitForm(container);

      expect(storeLot('lot-aapl-jan')).toMatchObject({ symbol: 'NVDA', shares: 10 });
      expect(rowOrder(container)).toEqual(['AAPL', 'MSFT', 'NVDA']);
      expect(rowCells(symbolRow('AAPL'))).toEqual(['10', '$20.00', '$200.00']);
      expect(rowCells(symbolRow('NVDA'))).toEqual(['10', '$10.00', '$100.00']);
      expect(symbolRow('NVDA')).toHaveClass('expanded-row');
      expect(symbolRow('AAPL')).not.toHaveClass('expanded-row');
    });

    test('restores the last added symbol and date after saving an edit', () => {
      const { container } = render(<EquityHoldingsManager />);

      fillForm({ symbol: 'tsla', shares: '1', price: '100', date: '2024-06-01' });
      submitForm(container);

      startEditing(container, 'MSFT', 'Feb 1, 2024');
      setField('Quantity', '6');
      submitForm(container);

      expect(storeLot('lot-msft-feb')?.shares).toBe(6);
      expect(input('Ticker Symbol').value).toBe('TSLA');
      expect(input('Trade Date').value).toBe('2024-06-01');
      expect(input('Quantity').value).toBe('');
      expectAddMode();
    });

    test('cancel returns to add mode without touching the store', () => {
      const { container } = render(<EquityHoldingsManager />);

      startEditing(container, 'MSFT', 'Feb 1, 2024');
      setField('Quantity', '999');
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(storeLots()).toEqual(fixtureLots);
      expectAddMode();
      expect(input('Ticker Symbol').value).toBe('');
      expect(input('Quantity').value).toBe('');
      expect(input('Price per Share').value).toBe('');
      expect(input('Trade Date').value).toBe('');
      expect(fundingSelect().value).toBe('seed');
    });

    test('validates while editing and stays in edit mode on failure', () => {
      const { container } = render(<EquityHoldingsManager />);

      startEditing(container, 'MSFT', 'Feb 1, 2024');
      setField('Price per Share', '0');
      submitForm(container);

      expect(screen.getByText('Price per share must be a positive number')).toBeInTheDocument();
      expectEditMode();
      expect(storeLot('lot-msft-feb')).toEqual(msftFeb);

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByText('Price per share must be a positive number')).toBeNull();
    });
  });

  describe('deleting a lot', () => {
    beforeEach(() => {
      seedStore(fixtureLots);
    });

    const clickDelete = (container: HTMLElement, symbol: string, formattedDate: string) => {
      fireEvent.click(symbolRow(symbol));
      fireEvent.click(buttonIn(lotRowFor(container, formattedDate), 'Delete'));
    };

    test('keeps the lot when the confirmation is declined', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { container } = render(<EquityHoldingsManager />);

      clickDelete(container, 'AAPL', 'Jan 1, 2024');

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(confirmSpy).toHaveBeenCalledWith(CONFIRM_MESSAGE);
      expect(storeLots()).toEqual(fixtureLots);
      expect(lotRows(container)).toHaveLength(2);
      expect(symbolRow('AAPL')).toHaveClass('expanded-row');
    });

    test('removes the lot when confirmed and keeps the symbol expanded', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const { container } = render(<EquityHoldingsManager />);

      clickDelete(container, 'AAPL', 'Jan 1, 2024');

      expect(storeLots().map(lot => lot.id)).toEqual(['lot-aapl-mar', 'lot-msft-feb']);
      expect(symbolRow('AAPL')).toHaveClass('expanded-row');
      expect(lotRows(container)).toHaveLength(1);
      expect(lotRows(container)[0].cells[0].textContent).toBe('Mar 1, 2024');
      expect(rowCells(symbolRow('AAPL'))).toEqual(['10', '$20.00', '$200.00']);
      expect(container.textContent).toContain('15 shares');
      expect(container.textContent).toContain('Cost basis $450.00');
    });

    test('removes the symbol row when its last lot is deleted', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const { container } = render(<EquityHoldingsManager />);

      clickDelete(container, 'MSFT', 'Feb 1, 2024');

      expect(storeLots().map(lot => lot.id)).toEqual(['lot-aapl-jan', 'lot-aapl-mar']);
      expect(rowOrder(container)).toEqual(['AAPL']);
      expect(detailsRow(container)).toBeNull();
      expect(screen.queryByText('MSFT', { selector: 'div.table-cell__meta' })).toBeNull();
    });

    test('resets the form when the lot being edited is deleted', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const { container } = render(<EquityHoldingsManager />);

      fireEvent.click(symbolRow('AAPL'));
      fireEvent.click(buttonIn(lotRowFor(container, 'Mar 1, 2024'), 'Edit'));
      expectEditMode();
      expect(input('Quantity').value).toBe('10');

      fireEvent.click(buttonIn(lotRowFor(container, 'Mar 1, 2024'), 'Delete'));

      expect(storeLot('lot-aapl-mar')).toBeUndefined();
      expectAddMode();
      expect(input('Ticker Symbol').value).toBe('');
      expect(input('Quantity').value).toBe('');
      expect(input('Price per Share').value).toBe('');
    });

    test('deleting a different lot leaves the edit in progress', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const { container } = render(<EquityHoldingsManager />);

      fireEvent.click(symbolRow('AAPL'));
      fireEvent.click(buttonIn(lotRowFor(container, 'Mar 1, 2024'), 'Edit'));
      fireEvent.click(buttonIn(lotRowFor(container, 'Jan 1, 2024'), 'Delete'));

      expect(storeLot('lot-aapl-jan')).toBeUndefined();
      expectEditMode();
      expect(Number(input('Price per Share').value)).toBe(20);
    });
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { DividendResult, QuoteResult } from '../../services/marketData';
import type { PortfolioSnapshot, PurchaseLot } from '../../types/portfolio';

vi.mock('../../utils/storage', () => ({
  STORAGE_KEYS: [
    'portfolio-snapshot',
    'portfolio-custom-lots',
    'saved-portfolios',
    'active-portfolio-id',
  ],
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

import { DataMenu } from './DataMenu';
import { usePortfolioStore } from '../../store/portfolioStore';

const snapshot: PortfolioSnapshot = {
  asOf: '2025-01-15',
  seedAmount: 10000,
  seedDate: '2024-01-01',
  equityMetadata: [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      sector: 'Technology',
      shares: 0,
      averageCost: 150,
      currentPrice: 180,
      dividends: [],
      navHistory: [],
    },
  ],
};

const customLots: PurchaseLot[] = [
  { id: 'lot-1', symbol: 'AAPL', tradeDate: '2024-01-01', shares: 10, pricePerShare: 150 },
];

const importedLot: PurchaseLot = {
  id: 'lot-msft',
  symbol: 'MSFT',
  tradeDate: '2024-06-01',
  shares: 5,
  pricePerShare: 300,
};

const importedSnapshot: PortfolioSnapshot = {
  asOf: '2024-12-31',
  seedAmount: 5000,
  equityMetadata: [
    {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      sector: 'Technology',
      shares: 0,
      averageCost: 300,
      currentPrice: 400,
      dividends: [],
      navHistory: [],
    },
  ],
};

const CLEAR_CONFIRM =
  'Are you sure you want to clear all portfolio data? This will reset to the default sample portfolio. Consider downloading a backup first.';

// The component formats "now" with this exact formatter, so build the expected clock the same
// way instead of hardcoding "2:05 PM" (newer ICU builds insert U+202F before AM/PM).
const clock = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' }).format(date);

const toggle = () => screen.getByRole('button', { name: 'Portfolio options' });
const menuItem = (name: string) => screen.getByRole('button', { name });
const openMenu = () => fireEvent.click(toggle());
const menuIsOpen = () => screen.queryByRole('button', { name: 'Import...' }) !== null;
const status = () => document.querySelector('.data-menu__status');
const fileInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

// jsdom's File has no text(); attach one the same way portfolioImport.test.tsx does.
const jsonFile = (contents: string) => {
  const file = new File([contents], 'portfolio.json', { type: 'application/json' });
  file.text = async () => contents;
  return file;
};

const importFile = (file: File) => {
  fireEvent.change(fileInput(), { target: { files: [file] } });
};

// jsdom's Blob has no text() either, so read the export payload through FileReader.
const readBlobAsText = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });

const stubDownload = () => {
  const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
  const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  // A real anchor click on a blob: URL would make jsdom attempt a navigation it cannot perform.
  const click = vi.spyOn(HTMLElement.prototype, 'click').mockImplementation(() => {});
  return { createObjectURL, revokeObjectURL, click };
};

const refreshQuotes = vi.fn<() => Promise<QuoteResult[]>>();
const refreshDividends = vi.fn<() => Promise<DividendResult[]>>();

describe('DataMenu', () => {
  beforeEach(() => {
    refreshQuotes.mockReset().mockResolvedValue([]);
    refreshDividends.mockReset().mockResolvedValue([]);
    usePortfolioStore.setState({
      snapshot,
      customLots,
      activePortfolioId: null,
      activePortfolioName: null,
      quoteStatus: { isLoading: false },
      dividendStatus: { isLoading: false },
      refreshQuotes,
      refreshDividends,
    });
    vi.spyOn(window, 'confirm').mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('menu toggle', () => {
    test('starts closed and toggles on the options button', () => {
      render(<DataMenu />);

      expect(toggle()).toHaveAttribute('aria-expanded', 'false');
      expect(menuIsOpen()).toBe(false);
      expect(status()).toBeNull();

      openMenu();
      expect(toggle()).toHaveAttribute('aria-expanded', 'true');
      expect(
        screen
          .getAllByRole('button')
          .map(button => button.textContent)
          .slice(1)
      ).toEqual([
        'Manage portfolios',
        'Import...',
        'Export...',
        'Refresh market prices',
        'Refresh dividends',
        'Clear all storage',
      ]);

      openMenu();
      expect(toggle()).toHaveAttribute('aria-expanded', 'false');
      expect(menuIsOpen()).toBe(false);
    });

    test('closes on a mousedown outside but not on one inside the menu or button', () => {
      render(<DataMenu />);
      openMenu();

      fireEvent.mouseDown(menuItem('Export...'));
      expect(menuIsOpen()).toBe(true);

      fireEvent.mouseDown(toggle());
      expect(menuIsOpen()).toBe(true);

      fireEvent.mouseDown(document.body);
      expect(menuIsOpen()).toBe(false);
    });

    test('ignores outside mousedowns once the menu has been closed', () => {
      render(<DataMenu />);
      openMenu();
      openMenu();

      fireEvent.mouseDown(document.body);
      expect(menuIsOpen()).toBe(false);
      expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    });

    test('disables the refresh buttons and shows progress labels while refreshing', () => {
      usePortfolioStore.setState({
        quoteStatus: { isLoading: true },
        dividendStatus: { isLoading: true },
      });
      render(<DataMenu />);
      openMenu();

      expect(menuItem('Refreshing prices…')).toBeDisabled();
      expect(menuItem('Refreshing dividends…')).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Refresh market prices' })).toBeNull();
    });
  });

  describe('manage portfolios', () => {
    test('opens the portfolio manager, closes the menu, and closes the manager again', () => {
      render(<DataMenu />);
      expect(screen.queryByRole('heading', { name: 'Portfolio Manager' })).toBeNull();

      openMenu();
      fireEvent.click(menuItem('Manage portfolios'));

      expect(screen.getByRole('heading', { name: 'Portfolio Manager' })).toBeInTheDocument();
      expect(menuIsOpen()).toBe(false);

      fireEvent.click(screen.getByRole('button', { name: '×' }));
      expect(screen.queryByRole('heading', { name: 'Portfolio Manager' })).toBeNull();
    });
  });

  describe('import', () => {
    test('opens the hidden file picker and closes the menu', () => {
      const click = vi.spyOn(HTMLElement.prototype, 'click').mockImplementation(() => {});
      render(<DataMenu />);
      openMenu();

      fireEvent.click(menuItem('Import...'));

      expect(click).toHaveBeenCalledTimes(1);
      expect(click.mock.contexts[0]).toBe(fileInput());
      expect(fileInput()).toHaveAttribute('accept', 'application/json');
      expect(menuIsOpen()).toBe(false);
    });

    test('loads an exported file into the store and reports the result', async () => {
      render(<DataMenu />);

      importFile(
        jsonFile(JSON.stringify({ snapshot: importedSnapshot, customLots: [importedLot] }))
      );

      const message = await screen.findByText(
        'Imported snapshot as of Dec 31, 2024 with 1 custom lot.'
      );
      expect(message).toHaveClass('data-menu__status--success');

      const state = usePortfolioStore.getState();
      expect(state.snapshot.asOf).toBe('2024-12-31');
      expect(state.snapshot.seedAmount).toBe(5000);
      expect(state.snapshot.equityMetadata.map(equity => equity.symbol)).toEqual(['MSFT']);
      expect(state.customLots).toEqual([importedLot]);
      expect(fileInput().value).toBe('');
    });

    test('accepts a bare snapshot and pluralizes the lot count', async () => {
      render(<DataMenu />);

      importFile(jsonFile(JSON.stringify(importedSnapshot)));

      await screen.findByText('Imported snapshot as of Dec 31, 2024 with 0 custom lots.');
      expect(usePortfolioStore.getState().customLots).toEqual([]);
    });

    test('reports a file that is not JSON and leaves the store alone', async () => {
      render(<DataMenu />);

      importFile(jsonFile('{ not json'));

      const message = await screen.findByText('File is not valid JSON');
      expect(message).toHaveClass('data-menu__status--error');
      expect(usePortfolioStore.getState().snapshot).toBe(snapshot);
      expect(usePortfolioStore.getState().customLots).toBe(customLots);
    });

    test('reports a snapshot that fails validation', async () => {
      render(<DataMenu />);

      importFile(jsonFile(JSON.stringify({ snapshot: { equityMetadata: [] } })));

      const message = await screen.findByText('Snapshot requires an "asOf" ISO date string');
      expect(message).toHaveClass('data-menu__status--error');
      expect(usePortfolioStore.getState().snapshot).toBe(snapshot);
    });

    test('falls back to a generic message when the file read fails without an Error', async () => {
      render(<DataMenu />);
      const file = jsonFile('{}');
      file.text = () => Promise.reject('read aborted');

      importFile(file);

      await screen.findByText('Failed to import portfolio file.');
    });

    test('does nothing when the picker is dismissed without a file', () => {
      render(<DataMenu />);

      fireEvent.change(fileInput(), { target: { files: [] } });

      expect(status()).toBeNull();
      expect(usePortfolioStore.getState().snapshot).toBe(snapshot);
    });
  });

  describe('export', () => {
    test('downloads the snapshot and lots as JSON named after the active portfolio', async () => {
      usePortfolioStore.setState({ activePortfolioName: 'Growth Fund' });
      const { createObjectURL, revokeObjectURL, click } = stubDownload();
      render(<DataMenu />);
      openMenu();

      fireEvent.click(menuItem('Export...'));

      expect(screen.getByText('Portfolio exported.')).toHaveClass('data-menu__status--success');
      expect(menuIsOpen()).toBe(false);

      const anchor = click.mock.contexts[0] as HTMLAnchorElement;
      expect(anchor.tagName).toBe('A');
      expect(anchor.download).toBe('growth-fund-2025-01-15.json');
      expect(anchor.href).toBe('blob:mock-url');
      expect(document.body.contains(anchor)).toBe(false);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

      const blob = createObjectURL.mock.calls[0][0] as Blob;
      expect(blob.type).toBe('application/json');
      const payload = JSON.parse(await readBlobAsText(blob));
      expect(payload.snapshot).toEqual(snapshot);
      expect(payload.customLots).toEqual(customLots);
      expect(new Date(payload.exportedAt).toISOString()).toBe(payload.exportedAt);
    });

    test('uses a generic filename when no portfolio is active', () => {
      const { click } = stubDownload();
      render(<DataMenu />);
      openMenu();

      fireEvent.click(menuItem('Export...'));

      const anchor = click.mock.contexts[0] as HTMLAnchorElement;
      expect(anchor.download).toBe('portfolio-2025-01-15.json');
    });

    test('reports the error message when creating the file fails', () => {
      stubDownload();
      vi.mocked(URL.createObjectURL).mockImplementation(() => {
        throw new Error('Blob URLs unavailable');
      });
      render(<DataMenu />);
      openMenu();

      fireEvent.click(menuItem('Export...'));

      expect(screen.getByText('Blob URLs unavailable')).toHaveClass('data-menu__status--error');
      expect(menuIsOpen()).toBe(false);
    });

    test('falls back to a generic message when the failure is not an Error', () => {
      stubDownload();
      vi.mocked(URL.createObjectURL).mockImplementation(() => {
        throw 'quota';
      });
      render(<DataMenu />);
      openMenu();

      fireEvent.click(menuItem('Export...'));

      expect(screen.getByText('Could not create export file.')).toHaveClass(
        'data-menu__status--error'
      );
    });
  });

  describe('refresh market prices', () => {
    test('closes the menu, calls the store, and reports the time', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const now = new Date('2025-03-01T14:05:00');
      vi.setSystemTime(now);
      refreshQuotes.mockResolvedValue([{ symbol: 'AAPL', regularMarketPrice: 180 }]);
      render(<DataMenu />);
      openMenu();

      fireEvent.click(menuItem('Refresh market prices'));

      expect(menuIsOpen()).toBe(false);
      expect(refreshQuotes).toHaveBeenCalledTimes(1);
      const message = await screen.findByText(/Market prices updated/);
      expect(message.textContent).toBe(`Market prices updated (${clock(now)}).`);
      expect(message).toHaveClass('data-menu__status--success');
    });

    test('lists the symbols that failed', async () => {
      refreshQuotes.mockResolvedValue([
        { symbol: 'AAPL', error: 'Rate limited' },
        { symbol: 'MSFT', regularMarketPrice: 400 },
        { symbol: 'GOOG', error: 'Unknown symbol' },
      ]);
      render(<DataMenu />);
      openMenu();

      fireEvent.click(menuItem('Refresh market prices'));

      const message = await screen.findByText(
        'Market prices refreshed with issues: AAPL (Rate limited), GOOG (Unknown symbol)'
      );
      expect(message).toHaveClass('data-menu__status--error');
    });

    test('shows the rejection message', async () => {
      refreshQuotes.mockRejectedValue(new Error('Network down'));
      render(<DataMenu />);
      openMenu();

      fireEvent.click(menuItem('Refresh market prices'));

      expect(await screen.findByText('Network down')).toHaveClass('data-menu__status--error');
    });

    test('falls back to a generic message when the rejection is not an Error', async () => {
      refreshQuotes.mockRejectedValue('timeout');
      render(<DataMenu />);
      openMenu();

      fireEvent.click(menuItem('Refresh market prices'));

      await screen.findByText('Failed to refresh market prices.');
    });
  });

  describe('refresh dividends', () => {
    test('counts only holdings that returned dividends', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const now = new Date('2025-03-01T09:30:00');
      vi.setSystemTime(now);
      refreshDividends.mockResolvedValue([
        { symbol: 'AAPL', dividends: [{ id: 'd1', date: '2025-02-01', amountPerShare: 0.25 }] },
        { symbol: 'MSFT', dividends: [] },
      ]);
      render(<DataMenu />);
      openMenu();

      fireEvent.click(menuItem('Refresh dividends'));

      expect(menuIsOpen()).toBe(false);
      expect(refreshDividends).toHaveBeenCalledTimes(1);
      const message = await screen.findByText(/Dividends updated/);
      expect(message.textContent).toBe(`Dividends updated for 1 holding (${clock(now)}).`);
      expect(message).toHaveClass('data-menu__status--success');
    });

    test('pluralizes the holding count', async () => {
      refreshDividends.mockResolvedValue([
        { symbol: 'AAPL', dividends: [{ id: 'd1', date: '2025-02-01', amountPerShare: 0.25 }] },
        { symbol: 'MSFT', dividends: [{ id: 'd2', date: '2025-02-10', amountPerShare: 0.75 }] },
      ]);
      render(<DataMenu />);
      openMenu();

      fireEvent.click(menuItem('Refresh dividends'));

      const message = await screen.findByText(/Dividends updated/);
      expect(message.textContent).toMatch(/^Dividends updated for 2 holdings \(.+\)\.$/);
    });

    test('lists the symbols that failed', async () => {
      refreshDividends.mockResolvedValue([
        { symbol: 'AAPL', dividends: [], error: 'No data' },
        { symbol: 'MSFT', dividends: [{ id: 'd2', date: '2025-02-10', amountPerShare: 0.75 }] },
      ]);
      render(<DataMenu />);
      openMenu();

      fireEvent.click(menuItem('Refresh dividends'));

      const message = await screen.findByText('Dividends refreshed with issues: AAPL (No data)');
      expect(message).toHaveClass('data-menu__status--error');
    });

    test('shows the rejection message', async () => {
      refreshDividends.mockRejectedValue(new Error('Polygon unavailable'));
      render(<DataMenu />);
      openMenu();

      fireEvent.click(menuItem('Refresh dividends'));

      expect(await screen.findByText('Polygon unavailable')).toHaveClass(
        'data-menu__status--error'
      );
    });

    test('falls back to a generic message when the rejection is not an Error', async () => {
      refreshDividends.mockRejectedValue(undefined);
      render(<DataMenu />);
      openMenu();

      fireEvent.click(menuItem('Refresh dividends'));

      await screen.findByText('Failed to refresh dividends.');
    });
  });

  describe('clear all storage', () => {
    test('asks for confirmation and does nothing when declined', () => {
      const removeItem = vi.spyOn(localStorage, 'removeItem');
      render(<DataMenu />);
      openMenu();

      fireEvent.click(menuItem('Clear all storage'));

      expect(window.confirm).toHaveBeenCalledWith(CLEAR_CONFIRM);
      expect(removeItem).not.toHaveBeenCalled();
      expect(status()).toBeNull();
      expect(menuIsOpen()).toBe(false);
    });

    test('removes the snapshot and lots and schedules a reload one second later', () => {
      vi.useFakeTimers();
      vi.mocked(window.confirm).mockReturnValue(true);
      const removeItem = vi.spyOn(localStorage, 'removeItem');
      render(<DataMenu />);
      openMenu();

      fireEvent.click(menuItem('Clear all storage'));

      expect(removeItem.mock.calls).toEqual([
        ['portfolio-snapshot'],
        ['portfolio-custom-lots'],
        ['saved-portfolios'],
        ['active-portfolio-id'],
      ]);
      expect(screen.getByText('Storage cleared. Reloading page...')).toHaveClass(
        'data-menu__status--success'
      );
      expect(menuIsOpen()).toBe(false);
      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(999);
      expect(vi.getTimerCount()).toBe(1);
      // The timer is left pending on purpose. Location.reload is unforgeable in jsdom, so it cannot
      // be stubbed, and letting it fire makes jsdom write "Not implemented: navigation" to stderr.
      // afterEach switches back to real timers, which drops the pending reload.
    });

    test('reports a storage error and does not schedule a reload', () => {
      vi.useFakeTimers();
      vi.mocked(window.confirm).mockReturnValue(true);
      vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('Storage is locked');
      });
      render(<DataMenu />);
      openMenu();

      fireEvent.click(menuItem('Clear all storage'));

      expect(screen.getByText('Storage is locked')).toHaveClass('data-menu__status--error');
      expect(menuIsOpen()).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    });

    test('falls back to a generic message when the storage failure is not an Error', () => {
      vi.mocked(window.confirm).mockReturnValue(true);
      vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
        throw 'denied';
      });
      render(<DataMenu />);
      openMenu();

      fireEvent.click(menuItem('Clear all storage'));

      expect(screen.getByText('Failed to clear storage.')).toHaveClass('data-menu__status--error');
    });
  });
});

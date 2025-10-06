import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { usePortfolioStore } from '../../store/portfolioStore';
import { formatDate } from '../../utils/formatters';
import { readSnapshotFile } from '../../utils/portfolioImport';
import { PortfolioManager } from './PortfolioManager';

interface StatusMessage {
  type: 'success' | 'error';
  message: string;
}

export const DataMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [showPortfolioManager, setShowPortfolioManager] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const snapshot = usePortfolioStore(state => state.snapshot);
  const customLots = usePortfolioStore(state => state.customLots);
  const activePortfolioName = usePortfolioStore(state => state.activePortfolioName);
  const loadPortfolio = usePortfolioStore(state => state.loadPortfolio);
  const refreshQuotes = usePortfolioStore(state => state.refreshQuotes);
  const quoteStatus = usePortfolioStore(state => state.quoteStatus);
  const refreshDividends = usePortfolioStore(state => state.refreshDividends);
  const dividendStatus = usePortfolioStore(state => state.dividendStatus);

  const toggleMenu = () => setOpen(prev => !prev);

  const closeMenu = () => setOpen(false);

  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      if (
        !menuRef.current ||
        !buttonRef.current ||
        menuRef.current.contains(event.target as Node) ||
        buttonRef.current.contains(event.target as Node)
      ) {
        return;
      }
      setOpen(false);
    };

    if (open) {
      document.addEventListener('mousedown', handleClickAway);
    }

    return () => document.removeEventListener('mousedown', handleClickAway);
  }, [open]);

  const handleRequestUpload = () => {
    fileInputRef.current?.click();
    closeMenu();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await readSnapshotFile(file);
      loadPortfolio(result.snapshot, result.customLots);
      setStatus({
        type: 'success',
        message: `Imported snapshot as of ${formatDate(result.snapshot.asOf)} with ${result.customLots.length} custom lot${
          result.customLots.length === 1 ? '' : 's'
        }.`,
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to import portfolio file.',
      });
    } finally {
      event.target.value = '';
    }
  };

  const handleRefreshPrices = async () => {
    closeMenu();
    try {
      const quotes = await refreshQuotes();
      const errors = quotes.filter(quote => quote.error);
      const timestamp = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
      }).format(new Date());
      setStatus({
        type: errors.length > 0 ? 'error' : 'success',
        message:
          errors.length > 0
            ? `Market prices refreshed with issues: ${errors
                .map(quote => `${quote.symbol}${quote.error ? ` (${quote.error})` : ''}`)
                .join(', ')}`
            : `Market prices updated (${timestamp}).`,
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to refresh market prices.',
      });
    }
  };

  const handleRefreshDividends = async () => {
    closeMenu();
    try {
      const results = await refreshDividends(); // Fetch dividends from earliest transaction date
      const errors = results.filter(result => result.error);
      const successCount = results.filter(result => result.dividends.length > 0).length;
      const timestamp = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
      }).format(new Date());
      setStatus({
        type: errors.length > 0 ? 'error' : 'success',
        message:
          errors.length > 0
            ? `Dividends refreshed with issues: ${errors
                .map(result => `${result.symbol}${result.error ? ` (${result.error})` : ''}`)
                .join(', ')}`
            : `Dividends updated for ${successCount} holding${successCount === 1 ? '' : 's'} (${timestamp}).`,
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to refresh dividends.',
      });
    }
  };

  const handleDownload = () => {
    try {
      // Export includes full snapshot (with seedAmount, seedDate, equities, etc.) and custom lots
      const payload = {
        exportedAt: new Date().toISOString(),
        snapshot, // Includes seedAmount and seedDate
        customLots,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;

      // Use portfolio name if available, otherwise use date
      const portfolioName = activePortfolioName
        ? activePortfolioName.replace(/[^a-z0-9]/gi, '-').toLowerCase()
        : 'portfolio';
      anchor.download = `${portfolioName}-${snapshot.asOf}.json`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatus({
        type: 'success',
        message: 'Portfolio exported.',
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Could not create export file.',
      });
    } finally {
      closeMenu();
    }
  };

  const handleClearStorage = () => {
    if (
      window.confirm(
        'Are you sure you want to clear all portfolio data? This will reset to the default sample portfolio. Consider downloading a backup first.'
      )
    ) {
      try {
        localStorage.removeItem('portfolio-snapshot');
        localStorage.removeItem('portfolio-custom-lots');
        setStatus({
          type: 'success',
          message: 'Storage cleared. Reloading page...',
        });
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        setStatus({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to clear storage.',
        });
      } finally {
        closeMenu();
      }
    } else {
      closeMenu();
    }
  };

  return (
    <div className="data-menu">
      <button
        ref={buttonRef}
        type="button"
        className="data-menu__toggle"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={toggleMenu}
      >
        <span className="data-menu__icon" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
        <span className="sr-only">Portfolio options</span>
      </button>
      {open && (
        <div ref={menuRef} className="data-menu__dropdown">
          <button
            type="button"
            onClick={() => {
              setShowPortfolioManager(true);
              closeMenu();
            }}
          >
            Manage portfolios
          </button>
          <button type="button" onClick={handleRequestUpload}>
            Import...
          </button>
          <button type="button" onClick={handleDownload}>
            Export...
          </button>
          <button type="button" onClick={handleRefreshPrices} disabled={quoteStatus.isLoading}>
            {quoteStatus.isLoading ? 'Refreshing prices…' : 'Refresh market prices'}
          </button>
          <button
            type="button"
            onClick={handleRefreshDividends}
            disabled={dividendStatus.isLoading}
          >
            {dividendStatus.isLoading ? 'Refreshing dividends…' : 'Refresh dividends'}
          </button>
          <button type="button" onClick={handleClearStorage} className="button-ghost--danger">
            Clear all storage
          </button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        hidden
        onChange={handleFileChange}
      />
      {status && (
        <div className={`data-menu__status data-menu__status--${status.type}`}>
          {status.message}
        </div>
      )}
      <PortfolioManager
        isOpen={showPortfolioManager}
        onClose={() => setShowPortfolioManager(false)}
      />
    </div>
  );
};

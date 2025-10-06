import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { deriveEquityViews, usePortfolioStore } from '../../store/portfolioStore';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface FormState {
  symbol: string;
  shares: string;
  pricePerShare: string;
  tradeDate: string;
}

interface EditableLot {
  id: string;
  symbol: string;
  shares: number;
  pricePerShare: number;
  tradeDate: string;
}

const generateLotId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `lot-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

type SortField = 'name' | 'shares' | 'avgPrice' | 'totalCost';
type SortDirection = 'asc' | 'desc';

export const EquityHoldingsManager: React.FC = () => {
  const [formState, setFormState] = useState<FormState>({
    symbol: '',
    shares: '',
    pricePerShare: '',
    tradeDate: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [lastSymbol, setLastSymbol] = useState<string>('');
  const [lastTradeDate, setLastTradeDate] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const snapshot = usePortfolioStore(state => state.snapshot);
  const customLots = usePortfolioStore(state => state.customLots);
  const equityViews = useMemo(
    () => deriveEquityViews(snapshot, customLots),
    [snapshot, customLots]
  );
  const addPurchaseLot = usePortfolioStore(state => state.addPurchaseLot);
  const updatePurchaseLot = usePortfolioStore(state => state.updatePurchaseLot);
  const removePurchaseLot = usePortfolioStore(state => state.removePurchaseLot);

  // Sort equity views
  const sortedEquityViews = useMemo(() => {
    const filtered = equityViews.filter(view => view.position.shares > 0);

    return filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'name':
          aValue = a.position.name.toLowerCase();
          bValue = b.position.name.toLowerCase();
          break;
        case 'shares':
          aValue = a.position.shares;
          bValue = b.position.shares;
          break;
        case 'avgPrice':
          aValue = a.position.averageCost;
          bValue = b.position.averageCost;
          break;
        case 'totalCost':
          aValue = a.position.shares * a.position.averageCost;
          bValue = b.position.shares * b.position.averageCost;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [equityViews, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const manualTotals = useMemo(
    () =>
      equityViews.reduce(
        (acc, view) => {
          acc.totalShares += view.manualTotalShares;
          acc.totalCost += view.manualTotalCost;
          return acc;
        },
        { totalShares: 0, totalCost: 0 }
      ),
    [equityViews]
  );

  const handleChange = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setFormState(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handlePriceChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    // Only allow digits
    const digitsOnly = value.replace(/[^\d]/g, '');

    if (digitsOnly === '') {
      setFormState(prev => ({ ...prev, pricePerShare: '' }));
      return;
    }

    // Convert to number and divide by 100 to add decimal point 2 places from right
    const numericValue = parseInt(digitsOnly, 10) / 100;
    setFormState(prev => ({ ...prev, pricePerShare: numericValue.toFixed(2) }));
  };

  const resetForm = () => {
    // Keep symbol and trade date from last entry, clear shares and price
    setFormState({
      symbol: lastSymbol,
      shares: '',
      pricePerShare: '',
      tradeDate: lastTradeDate,
    });
    setEditingLotId(null);
    setFormError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const symbol = formState.symbol.trim().toUpperCase();
    const shares = Number(formState.shares);
    const pricePerShare = Number(formState.pricePerShare);
    const tradeDate = formState.tradeDate;

    if (!symbol) {
      setFormError('Symbol is required');
      return;
    }

    if (!Number.isFinite(shares) || shares <= 0) {
      setFormError('Quantity must be a positive number');
      return;
    }

    if (!Number.isFinite(pricePerShare) || pricePerShare <= 0) {
      setFormError('Price per share must be a positive number');
      return;
    }

    if (!tradeDate) {
      setFormError('Trade date is required');
      return;
    }

    if (editingLotId) {
      updatePurchaseLot(editingLotId, {
        symbol,
        shares,
        pricePerShare,
        tradeDate,
      });
      setExpandedSymbol(symbol);
      resetForm();
    } else {
      addPurchaseLot({
        id: generateLotId(),
        symbol,
        shares,
        pricePerShare,
        tradeDate,
      });
      // Save symbol and trade date for next entry (only when adding, not editing)
      setLastSymbol(symbol);
      setLastTradeDate(tradeDate);
      setExpandedSymbol(symbol);
      // Reset form with the new values directly (don't wait for state update)
      setFormState({
        symbol: symbol,
        shares: '',
        pricePerShare: '',
        tradeDate: tradeDate,
      });
      setEditingLotId(null);
      setFormError(null);
    }
  };

  const handleEditLot = (lot: EditableLot) => {
    setFormState({
      symbol: lot.symbol,
      shares: lot.shares.toString(),
      pricePerShare: lot.pricePerShare.toString(),
      tradeDate: lot.tradeDate,
    });
    setEditingLotId(lot.id);
    setFormError(null);
    setExpandedSymbol(lot.symbol);
  };

  const handleDeleteLot = (lotId: string, symbol: string) => {
    const shouldDelete =
      typeof window === 'undefined'
        ? true
        : window.confirm('Remove this lot? This cannot be undone.');
    if (!shouldDelete) return;

    // Check if this is the last lot for this symbol
    const lotsForSymbol = customLots.filter(
      lot => lot.symbol.toUpperCase() === symbol.toUpperCase()
    );
    const isLastLot = lotsForSymbol.length === 1 && lotsForSymbol[0].id === lotId;

    removePurchaseLot(lotId);

    if (editingLotId === lotId) {
      resetForm();
    }

    // If this was the last lot for the symbol, collapse the expanded view
    if (isLastLot && expandedSymbol === symbol) {
      setExpandedSymbol(null);
    }
  };

  return (
    <div className="holdings-manager">
      <form className="holdings-manager__form" onSubmit={handleSubmit}>
        <div className="holdings-manager__form-grid">
          <label>
            <span>Ticker Symbol</span>
            <input
              value={formState.symbol}
              onChange={handleChange('symbol')}
              placeholder="e.g. AAPL"
              required
            />
          </label>
          <label>
            <span>Quantity</span>
            <input
              type="number"
              inputMode="decimal"
              value={formState.shares}
              onChange={handleChange('shares')}
              min="0"
              step="any"
              required
            />
          </label>
          <label>
            <span>Price per Share</span>
            <input
              type="text"
              inputMode="numeric"
              value={formState.pricePerShare}
              onChange={handlePriceChange}
              placeholder="0.00"
              required
            />
          </label>
          <label>
            <span>Trade Date</span>
            <input
              type="date"
              value={formState.tradeDate}
              onChange={handleChange('tradeDate')}
              required
            />
          </label>
        </div>
        {formError && <div className="form-error">{formError}</div>}
        <div className="holdings-manager__actions">
          {editingLotId && (
            <button type="button" className="button-secondary" onClick={resetForm}>
              Cancel
            </button>
          )}
          <button type="submit">{editingLotId ? 'Save Changes' : 'Add Lot'}</button>
        </div>
      </form>

      <div className="holdings-manager__summary">
        <span>Custom lots tracked:</span>
        <strong>{manualTotals.totalShares.toLocaleString()} shares</strong>
        <span>• Cost basis {formatCurrency(manualTotals.totalCost)}</span>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
              Equity {sortField === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th
              onClick={() => handleSort('shares')}
              style={{ cursor: 'pointer', textAlign: 'right' }}
            >
              Total Shares {sortField === 'shares' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th
              onClick={() => handleSort('avgPrice')}
              style={{ cursor: 'pointer', textAlign: 'right' }}
            >
              Avg Price/Share {sortField === 'avgPrice' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th
              onClick={() => handleSort('totalCost')}
              style={{ cursor: 'pointer', textAlign: 'right' }}
            >
              Total Cost {sortField === 'totalCost' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedEquityViews.map(view => {
            const { position, manualLots } = view;
            const isExpanded = expandedSymbol === position.symbol;
            const totalCost = position.shares * position.averageCost;

            return (
              <>
                <tr
                  key={position.symbol}
                  onClick={() => setExpandedSymbol(isExpanded ? null : position.symbol)}
                  style={{ cursor: 'pointer' }}
                  className={isExpanded ? 'expanded-row' : ''}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem' }}>{isExpanded ? '▼' : '▶'}</span>
                      <div>
                        <div className="table-cell__main">{position.name}</div>
                        <div className="table-cell__meta">{position.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>{position.shares.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(position.averageCost)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(totalCost)}</td>
                </tr>
                {isExpanded && (
                  <tr key={`${position.symbol}-details`} className="dividend-details-row">
                    <td colSpan={4} style={{ padding: 0 }}>
                      <div
                        style={{ padding: '1rem', backgroundColor: 'var(--color-bg-secondary)' }}
                      >
                        {manualLots.length > 0 ? (
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Shares</th>
                                <th>Price/Share</th>
                                <th>Lot Cost</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {manualLots
                                .slice()
                                .sort(
                                  (a, b) =>
                                    Number(new Date(b.tradeDate)) - Number(new Date(a.tradeDate))
                                )
                                .map(lot => (
                                  <tr key={lot.id}>
                                    <td>{formatDate(lot.tradeDate)}</td>
                                    <td>{lot.shares.toLocaleString()}</td>
                                    <td>{formatCurrency(lot.pricePerShare)}</td>
                                    <td>{formatCurrency(lot.shares * lot.pricePerShare)}</td>
                                    <td>
                                      <div className="holdings-manager__lot-actions">
                                        <button
                                          type="button"
                                          className="button-ghost"
                                          onClick={e => {
                                            e.stopPropagation();
                                            handleEditLot({
                                              id: lot.id,
                                              symbol: lot.symbol,
                                              shares: lot.shares,
                                              pricePerShare: lot.pricePerShare,
                                              tradeDate: lot.tradeDate,
                                            });
                                          }}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          className="button-ghost button-ghost--danger"
                                          onClick={e => {
                                            e.stopPropagation();
                                            handleDeleteLot(lot.id, lot.symbol);
                                          }}
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="table-cell__meta">No manual lots added yet.</p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

import { useMemo, useState } from 'react';
import {
  calculateEquityMetrics,
  deriveEquityViews,
  usePortfolioStore,
} from '../../store/portfolioStore';
import { formatCurrency, formatDate, formatPercent } from '../../utils/formatters';

type SortField =
  | 'name'
  | 'shares'
  | 'marketValue'
  | 'costBasis'
  | 'unrealizedPnL'
  | 'totalReturn'
  | 'roi'
  | 'navPeak'
  | 'currentNav'
  | 'navDecayPercent'
  | 'totalDividends'
  | 'dividendYieldOnCost'
  | 'lastDividendAmount';
type SortDirection = 'asc' | 'desc';

export const CombinedEquityTable: React.FC = () => {
  const snapshot = usePortfolioStore(state => state.snapshot);
  const customLots = usePortfolioStore(state => state.customLots);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const data = useMemo(() => {
    return deriveEquityViews(snapshot, customLots)
      .filter(view => view.position.shares > 0)
      .map(view => {
        const equity = view.position;
        const metrics = calculateEquityMetrics(equity);

        // Calculate total dividends using actual shares at each payment date
        const totalDividends = view.dividendsWithShares.reduce(
          (sum, div) => sum + div.amountPerShare * div.sharesOwned,
          0
        );

        const lastDividendWithShares =
          view.dividendsWithShares[view.dividendsWithShares.length - 1];
        const lastDividendAmount = lastDividendWithShares
          ? lastDividendWithShares.amountPerShare * lastDividendWithShares.sharesOwned
          : undefined;

        // Recalculate metrics with correct dividend total
        const costBasis = metrics.costBasis;
        const marketValue = metrics.marketValue;
        const totalReturn = marketValue + totalDividends - costBasis;
        const roi = costBasis === 0 ? 0 : (totalReturn / costBasis) * 100;
        const dividendYieldOnCost = costBasis === 0 ? 0 : (totalDividends / costBasis) * 100;

        return {
          symbol: equity.symbol,
          name: equity.name,
          sector: equity.sector,
          shares: equity.shares,
          dividends: equity.dividends,
          dividendsWithShares: view.dividendsWithShares,
          // Performance metrics
          marketValue,
          costBasis,
          unrealizedPnL: marketValue - costBasis,
          totalReturn,
          roi,
          navDecayPercent: metrics.navDecayPercent,
          navPeak: metrics.navPeak,
          currentNav: equity.navHistory[equity.navHistory.length - 1]?.value ?? equity.currentPrice,
          // Dividend metrics
          totalDividends,
          dividendYieldOnCost,
          lastDividend: lastDividendWithShares,
          lastDividendAmount,
        };
      });
  }, [snapshot, customLots]);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'shares':
          aValue = a.shares;
          bValue = b.shares;
          break;
        case 'marketValue':
          aValue = a.marketValue;
          bValue = b.marketValue;
          break;
        case 'costBasis':
          aValue = a.costBasis;
          bValue = b.costBasis;
          break;
        case 'unrealizedPnL':
          aValue = a.unrealizedPnL;
          bValue = b.unrealizedPnL;
          break;
        case 'totalReturn':
          aValue = a.totalReturn;
          bValue = b.totalReturn;
          break;
        case 'roi':
          aValue = a.roi;
          bValue = b.roi;
          break;
        case 'navPeak':
          aValue = a.navPeak;
          bValue = b.navPeak;
          break;
        case 'currentNav':
          aValue = a.currentNav;
          bValue = b.currentNav;
          break;
        case 'navDecayPercent':
          aValue = a.navDecayPercent;
          bValue = b.navDecayPercent;
          break;
        case 'totalDividends':
          aValue = a.totalDividends;
          bValue = b.totalDividends;
          break;
        case 'dividendYieldOnCost':
          aValue = a.dividendYieldOnCost;
          bValue = b.dividendYieldOnCost;
          break;
        case 'lastDividendAmount':
          aValue = a.lastDividendAmount ?? -Infinity;
          bValue = b.lastDividendAmount ?? -Infinity;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleExpand = (symbol: string) => {
    setExpandedSymbol(expandedSymbol === symbol ? null : symbol);
  };

  const totals = useMemo(() => {
    return sortedData.reduce(
      (acc, row) => ({
        marketValue: acc.marketValue + row.marketValue,
        costBasis: acc.costBasis + row.costBasis,
        unrealizedPnL: acc.unrealizedPnL + row.unrealizedPnL,
        totalReturn: acc.totalReturn + row.totalReturn,
        totalDividends: acc.totalDividends + row.totalDividends,
      }),
      { marketValue: 0, costBasis: 0, unrealizedPnL: 0, totalReturn: 0, totalDividends: 0 }
    );
  }, [sortedData]);

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
              Symbol {sortField === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th
              onClick={() => handleSort('shares')}
              style={{ cursor: 'pointer', textAlign: 'right' }}
            >
              Shares {sortField === 'shares' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th
              onClick={() => handleSort('marketValue')}
              style={{ cursor: 'pointer', textAlign: 'right' }}
            >
              Market Value {sortField === 'marketValue' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th
              onClick={() => handleSort('costBasis')}
              style={{ cursor: 'pointer', textAlign: 'right' }}
            >
              Cost Basis {sortField === 'costBasis' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th
              onClick={() => handleSort('unrealizedPnL')}
              style={{ cursor: 'pointer', textAlign: 'right' }}
            >
              Unrealized P&L{' '}
              {sortField === 'unrealizedPnL' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th
              onClick={() => handleSort('totalReturn')}
              style={{ cursor: 'pointer', textAlign: 'right' }}
            >
              Total Return {sortField === 'totalReturn' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th onClick={() => handleSort('roi')} style={{ cursor: 'pointer', textAlign: 'right' }}>
              ROI {sortField === 'roi' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th
              onClick={() => handleSort('navPeak')}
              style={{ cursor: 'pointer', textAlign: 'right' }}
            >
              NAV Peak {sortField === 'navPeak' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th
              onClick={() => handleSort('currentNav')}
              style={{ cursor: 'pointer', textAlign: 'right' }}
            >
              Current NAV {sortField === 'currentNav' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th
              onClick={() => handleSort('navDecayPercent')}
              style={{ cursor: 'pointer', textAlign: 'right' }}
            >
              NAV Erosion {sortField === 'navDecayPercent' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th
              onClick={() => handleSort('totalDividends')}
              style={{ cursor: 'pointer', textAlign: 'right' }}
            >
              Dividend Income{' '}
              {sortField === 'totalDividends' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th
              onClick={() => handleSort('dividendYieldOnCost')}
              style={{ cursor: 'pointer', textAlign: 'right' }}
            >
              Yield on Cost{' '}
              {sortField === 'dividendYieldOnCost' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th
              onClick={() => handleSort('lastDividendAmount')}
              style={{ cursor: 'pointer', textAlign: 'right' }}
            >
              Last Payment{' '}
              {sortField === 'lastDividendAmount' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map(row => {
            const isExpanded = expandedSymbol === row.symbol;
            return (
              <>
                <tr
                  key={row.symbol}
                  onClick={() => toggleExpand(row.symbol)}
                  style={{ cursor: 'pointer' }}
                  className={isExpanded ? 'expanded-row' : ''}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem' }}>{isExpanded ? '▼' : '▶'}</span>
                      <div>
                        <div className="table-cell__main">{row.name}</div>
                        <div className="table-cell__meta">{row.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td>{row.shares}</td>
                  <td>{formatCurrency(row.marketValue)}</td>
                  <td>{formatCurrency(row.costBasis)}</td>
                  <td className={row.unrealizedPnL >= 0 ? 'value-positive' : 'value-negative'}>
                    {formatCurrency(row.unrealizedPnL)}
                  </td>
                  <td className={row.totalReturn >= 0 ? 'value-positive' : 'value-negative'}>
                    {formatCurrency(row.totalReturn)}
                  </td>
                  <td className={row.roi >= 0 ? 'value-positive' : 'value-negative'}>
                    {formatPercent(row.roi)}
                  </td>
                  <td>{formatCurrency(row.navPeak)}</td>
                  <td>{formatCurrency(row.currentNav)}</td>
                  <td className={row.navDecayPercent <= 0 ? 'value-positive' : 'value-negative'}>
                    {formatPercent(row.navDecayPercent)}
                  </td>
                  <td>{formatCurrency(row.totalDividends)}</td>
                  <td>{formatPercent(row.dividendYieldOnCost)}</td>
                  <td>
                    {row.lastDividend && row.lastDividendAmount !== undefined ? (
                      <div>
                        <div>{formatCurrency(row.lastDividendAmount)}</div>
                        <div className="table-cell__meta">{formatDate(row.lastDividend.date)}</div>
                      </div>
                    ) : (
                      <span className="table-cell__meta">No payouts</span>
                    )}
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${row.symbol}-details`} className="dividend-details-row">
                    <td colSpan={13}>
                      <div className="dividend-details">
                        <div className="equity-details-grid">
                          {/* Performance Details */}
                          <div className="equity-details-section">
                            <h4>Performance Metrics</h4>
                            <div className="equity-details-metrics">
                              <div className="metric-row">
                                <span className="metric-label">Sector:</span>
                                <span className="metric-value">{row.sector}</span>
                              </div>
                              <div className="metric-row">
                                <span className="metric-label">NAV Peak:</span>
                                <span className="metric-value">{formatCurrency(row.navPeak)}</span>
                              </div>
                              <div className="metric-row">
                                <span className="metric-label">Current NAV:</span>
                                <span className="metric-value">
                                  {formatCurrency(row.currentNav)}
                                </span>
                              </div>
                              <div className="metric-row">
                                <span className="metric-label">NAV Decay:</span>
                                <span
                                  className={`metric-value ${row.navDecayPercent > 0 ? 'value-negative' : 'value-positive'}`}
                                >
                                  {formatPercent(row.navDecayPercent)}
                                </span>
                              </div>
                              <div className="metric-row">
                                <span className="metric-label">Unrealized Gain/Loss:</span>
                                <span
                                  className={`metric-value ${row.unrealizedPnL >= 0 ? 'value-positive' : 'value-negative'}`}
                                >
                                  {formatCurrency(row.unrealizedPnL)}
                                </span>
                              </div>
                              <div className="metric-row">
                                <span className="metric-label">
                                  Total Return (incl. dividends):
                                </span>
                                <span
                                  className={`metric-value ${row.totalReturn >= 0 ? 'value-positive' : 'value-negative'}`}
                                >
                                  {formatCurrency(row.totalReturn)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Dividend History */}
                          <div className="equity-details-section">
                            <h4>Dividend History ({row.dividendsWithShares.length} payments)</h4>
                            {row.dividendsWithShares.length > 0 ? (
                              <div className="dividend-history-scroll">
                                <table className="dividend-details-table">
                                  <thead>
                                    <tr>
                                      <th>Date</th>
                                      <th>Shares</th>
                                      <th>Per Share</th>
                                      <th>Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.dividendsWithShares
                                      .slice()
                                      .reverse()
                                      .map(dividend => (
                                        <tr key={dividend.id}>
                                          <td>{formatDate(dividend.date)}</td>
                                          <td>{dividend.sharesOwned.toFixed(2)}</td>
                                          <td>{formatCurrency(dividend.amountPerShare)}</td>
                                          <td>
                                            {formatCurrency(
                                              dividend.amountPerShare * dividend.sharesOwned
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                  <tfoot>
                                    <tr>
                                      <td colSpan={3}>
                                        <strong>Total</strong>
                                      </td>
                                      <td>
                                        <strong>{formatCurrency(row.totalDividends)}</strong>
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            ) : (
                              <p className="table-cell__meta">No dividend history available</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>
              <strong>Portfolio Total</strong>
            </td>
            <td>
              <strong>{formatCurrency(totals.marketValue)}</strong>
            </td>
            <td>
              <strong>{formatCurrency(totals.costBasis)}</strong>
            </td>
            <td className={totals.unrealizedPnL >= 0 ? 'value-positive' : 'value-negative'}>
              <strong>{formatCurrency(totals.unrealizedPnL)}</strong>
            </td>
            <td className={totals.totalReturn >= 0 ? 'value-positive' : 'value-negative'}>
              <strong>{formatCurrency(totals.totalReturn)}</strong>
            </td>
            <td>
              <strong>
                {totals.costBasis > 0
                  ? formatPercent((totals.totalReturn / totals.costBasis) * 100)
                  : '—'}
              </strong>
            </td>
            <td></td>
            <td></td>
            <td></td>
            <td>
              <strong>{formatCurrency(totals.totalDividends)}</strong>
            </td>
            <td>
              <strong>
                {totals.costBasis > 0
                  ? formatPercent((totals.totalDividends / totals.costBasis) * 100)
                  : '—'}
              </strong>
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

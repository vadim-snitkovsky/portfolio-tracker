import { useMemo, useState } from 'react';
import {
  calculateEquityMetrics,
  deriveEquityViews,
  usePortfolioStore,
} from '../../store/portfolioStore';
import { formatCurrency, formatDate, formatPercent } from '../../utils/formatters';

export const DividendTable: React.FC = () => {
  const snapshot = usePortfolioStore(state => state.snapshot);
  const customLots = usePortfolioStore(state => state.customLots);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  const data = useMemo(() => {
    return deriveEquityViews(snapshot, customLots)
      .map(view => view.position)
      .filter(equity => equity.shares > 0)
      .map(equity => {
        const metrics = calculateEquityMetrics(equity);
        const lastDividend = equity.dividends[equity.dividends.length - 1];
        const lastDividendAmount = lastDividend
          ? lastDividend.amountPerShare * equity.shares
          : undefined;
        const annualizedIncome = metrics.totalDividends; // Using trailing 12 months sample data
        return {
          symbol: equity.symbol,
          name: equity.name,
          shares: equity.shares,
          dividends: equity.dividends,
          totalDividends: metrics.totalDividends,
          dividendYieldOnCost: metrics.dividendYieldOnCost,
          roi: metrics.roi,
          lastDividend,
          lastDividendAmount,
          annualizedIncome,
        };
      });
  }, [snapshot, customLots]);

  const toggleExpand = (symbol: string) => {
    setExpandedSymbol(expandedSymbol === symbol ? null : symbol);
  };

  const totalDividends = data.reduce((acc, row) => acc + row.totalDividends, 0);

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Company</th>
            <th>Trailing Income</th>
            <th>Yield on Cost</th>
            <th>Total ROI</th>
            <th>Last Payment</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => {
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
                      <span>{row.symbol}</span>
                    </div>
                  </td>
                  <td>
                    <div className="table-cell__main">{row.name}</div>
                    <div className="table-cell__meta">
                      Annualized: {formatCurrency(row.annualizedIncome)}
                    </div>
                  </td>
                  <td>{formatCurrency(row.totalDividends)}</td>
                  <td>{formatPercent(row.dividendYieldOnCost)}</td>
                  <td>{formatPercent(row.roi)}</td>
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
                    <td colSpan={6}>
                      <div className="dividend-details">
                        <h4>Dividend History for {row.symbol}</h4>
                        {row.dividends.length > 0 ? (
                          <table className="dividend-details-table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Amount per Share</th>
                                <th>Total Amount ({row.shares} shares)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.dividends
                                .slice()
                                .reverse()
                                .map(dividend => (
                                  <tr key={dividend.id}>
                                    <td>{formatDate(dividend.date)}</td>
                                    <td>{formatCurrency(dividend.amountPerShare)}</td>
                                    <td>{formatCurrency(dividend.amountPerShare * row.shares)}</td>
                                  </tr>
                                ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colSpan={2}>
                                  <strong>Total ({row.dividends.length} payments)</strong>
                                </td>
                                <td>
                                  <strong>{formatCurrency(row.totalDividends)}</strong>
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        ) : (
                          <p className="table-cell__meta">No dividend history available</p>
                        )}
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
            <td colSpan={2}>Portfolio Total</td>
            <td>{formatCurrency(totalDividends)}</td>
            <td colSpan={3}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

import { useMemo, useState } from 'react';
import { deriveEquityViews, usePortfolioStore } from '../../store/portfolioStore';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface DividendTransaction {
  id: string;
  symbol: string;
  name: string;
  date: string;
  shares: number;
  amountPerShare: number;
  totalAmount: number;
}

interface PurchaseTransaction {
  id: string;
  symbol: string;
  date: string;
  shares: number;
  pricePerShare: number;
  totalCost: number;
}

interface MonthlyData {
  month: string; // YYYY-MM format
  monthLabel: string; // "Jan 2025" format
  cashInvested: number;
  dividendsReceived: number;
  netCashFlow: number;
  cumulativeCashInvested: number;
  cumulativeDividends: number;
  purchaseCount: number;
  dividendCount: number;
  dividendTransactions: DividendTransaction[];
  purchaseTransactions: PurchaseTransaction[];
}

export const CashFlowReport: React.FC = () => {
  const snapshot = usePortfolioStore((state) => state.snapshot);
  const customLots = usePortfolioStore((state) => state.customLots);
  const equityViews = useMemo(() => deriveEquityViews(snapshot, customLots), [snapshot, customLots]);
  const removeDividend = usePortfolioStore((state) => state.removeDividend);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const seedAmount = snapshot.seedAmount ?? 0;
  const seedDate = snapshot.seedDate ?? '2025-02-10';

  // Calculate monthly cash flow data
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, MonthlyData>();

    // Process all purchase lots
    customLots.forEach((lot) => {
      const date = new Date(lot.tradeDate + 'T00:00:00');
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          month: monthKey,
          monthLabel,
          cashInvested: 0,
          dividendsReceived: 0,
          netCashFlow: 0,
          cumulativeCashInvested: 0,
          cumulativeDividends: 0,
          purchaseCount: 0,
          dividendCount: 0,
          dividendTransactions: [],
          purchaseTransactions: []
        });
      }

      const data = monthMap.get(monthKey)!;
      const totalCost = lot.shares * lot.pricePerShare;
      data.cashInvested += totalCost;
      data.purchaseCount += 1;

      // Add purchase transaction details
      data.purchaseTransactions.push({
        id: lot.id,
        symbol: lot.symbol,
        date: lot.tradeDate,
        shares: lot.shares,
        pricePerShare: lot.pricePerShare,
        totalCost
      });
    });

    // Process all dividends
    equityViews.forEach((view) => {
      const { position, earliestAcquisitionDate, dividendsWithShares } = view;

      dividendsWithShares.forEach((dividend) => {
        // Only count dividends on or after earliest acquisition date
        if (earliestAcquisitionDate && dividend.date >= earliestAcquisitionDate) {
          const date = new Date(dividend.date + 'T00:00:00');
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

          if (!monthMap.has(monthKey)) {
            monthMap.set(monthKey, {
              month: monthKey,
              monthLabel,
              cashInvested: 0,
              dividendsReceived: 0,
              netCashFlow: 0,
              cumulativeCashInvested: 0,
              cumulativeDividends: 0,
              purchaseCount: 0,
              dividendCount: 0,
              dividendTransactions: [],
              purchaseTransactions: []
            });
          }

          const data = monthMap.get(monthKey)!;
          const totalAmount = dividend.amountPerShare * dividend.sharesOwned;
          data.dividendsReceived += totalAmount;
          data.dividendCount += 1;

          // Add transaction details
          data.dividendTransactions.push({
            id: dividend.id,
            symbol: position.symbol,
            name: position.name,
            date: dividend.date,
            shares: dividend.sharesOwned,
            amountPerShare: dividend.amountPerShare,
            totalAmount
          });
        }
      });
    });

    // Sort by month and calculate cumulative values
    const sortedMonths = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    let cumulativeCash = 0;
    let cumulativeDivs = 0;

    sortedMonths.forEach((data) => {
      cumulativeCash += data.cashInvested;
      cumulativeDivs += data.dividendsReceived;
      data.cumulativeCashInvested = cumulativeCash;
      data.cumulativeDividends = cumulativeDivs;
      data.netCashFlow = data.dividendsReceived - data.cashInvested;
    });

    return sortedMonths;
  }, [customLots, equityViews]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalCashInvested = monthlyData.reduce((sum, m) => sum + m.cashInvested, 0);
    const totalDividends = monthlyData.reduce((sum, m) => sum + m.dividendsReceived, 0);
    const netCashFlow = totalDividends - totalCashInvested;
    const totalPurchases = monthlyData.reduce((sum, m) => sum + m.purchaseCount, 0);
    const totalDividendPayments = monthlyData.reduce((sum, m) => sum + m.dividendCount, 0);

    return {
      totalCashInvested,
      totalDividends,
      netCashFlow,
      totalPurchases,
      totalDividendPayments,
      returnOnInvestment: totalCashInvested > 0 ? (totalDividends / totalCashInvested) * 100 : 0
    };
  }, [monthlyData]);

  return (
    <div className="cash-flow-report">
      {/* Summary Cards */}
      <div className="metric-grid" style={{ marginBottom: '2rem' }}>
        <div className="metric-tile">
          <div className="metric-tile__label">Initial Seed</div>
          <div className="metric-tile__value">{formatCurrency(seedAmount)}</div>
          <div className="metric-tile__trend">
            <span className="metric-tile__trend-label">{formatDate(seedDate)}</span>
          </div>
        </div>

        <div className="metric-tile">
          <div className="metric-tile__label">Total Cash Invested</div>
          <div className="metric-tile__value">{formatCurrency(totals.totalCashInvested)}</div>
          <div className="metric-tile__trend">
            <span className="metric-tile__trend-label">{totals.totalPurchases} purchases</span>
          </div>
        </div>

        <div className="metric-tile">
          <div className="metric-tile__label">Total Dividends Received</div>
          <div className="metric-tile__value">{formatCurrency(totals.totalDividends)}</div>
          <div className="metric-tile__trend">
            <span className="metric-tile__trend-label">{totals.totalDividendPayments} payments</span>
          </div>
        </div>

        <div className="metric-tile">
          <div className="metric-tile__label">Net Cash Flow</div>
          <div className="metric-tile__value" style={{ color: totals.netCashFlow >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}>
            {formatCurrency(totals.netCashFlow)}
          </div>
          <div className="metric-tile__trend">
            <span className={totals.netCashFlow >= 0 ? 'metric-tile__trend-positive' : 'metric-tile__trend-negative'}>
              {totals.netCashFlow >= 0 ? 'Positive' : 'Negative'} flow
            </span>
          </div>
        </div>

        <div className="metric-tile">
          <div className="metric-tile__label">Available Capital</div>
          <div className="metric-tile__value">{formatCurrency(seedAmount - totals.totalCashInvested + totals.totalDividends)}</div>
          <div className="metric-tile__trend">
            <span className="metric-tile__trend-label">Seed + Dividends - Invested</span>
          </div>
        </div>

        <div className="metric-tile">
          <div className="metric-tile__label">Dividend Return on Investment</div>
          <div className="metric-tile__value">{totals.returnOnInvestment.toFixed(2)}%</div>
          <div className="metric-tile__trend">
            <span className="metric-tile__trend-label metric-tile__trend-positive">
              Dividends / Cash Invested
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Cash Flow Table */}
      <div className="table-wrapper">
        <h3 style={{ marginBottom: '1rem' }}>Monthly Cash Flow</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th style={{ textAlign: 'right' }}>Cash Invested</th>
              <th style={{ textAlign: 'right' }}>Dividends Received</th>
              <th style={{ textAlign: 'right' }}>Net Cash Flow</th>
              <th style={{ textAlign: 'right' }}>Cumulative Invested</th>
              <th style={{ textAlign: 'right' }}>Cumulative Dividends</th>
              <th style={{ textAlign: 'right' }}>Purchases</th>
              <th style={{ textAlign: 'right' }}>Dividend Payments</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((data) => {
              const isExpanded = expandedMonth === data.month;
              const hasTransactions = data.dividendTransactions.length > 0 || data.purchaseTransactions.length > 0;

              return (
                <>
                  <tr
                    key={data.month}
                    onClick={() => hasTransactions && setExpandedMonth(isExpanded ? null : data.month)}
                    style={{ cursor: hasTransactions ? 'pointer' : 'default' }}
                    className={isExpanded ? 'expanded-row' : ''}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {hasTransactions && <span style={{ fontSize: '0.8rem' }}>{isExpanded ? '▼' : '▶'}</span>}
                        {data.monthLabel}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(data.cashInvested)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(data.dividendsReceived)}</td>
                    <td style={{ textAlign: 'right', color: data.netCashFlow >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                      {formatCurrency(data.netCashFlow)}
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(data.cumulativeCashInvested)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(data.cumulativeDividends)}</td>
                    <td style={{ textAlign: 'right' }}>{data.purchaseCount}</td>
                    <td style={{ textAlign: 'right' }}>{data.dividendCount}</td>
                  </tr>
                  {isExpanded && hasTransactions && (
                    <tr key={`${data.month}-details`} className="dividend-details-row">
                      <td colSpan={8} style={{ padding: 0 }}>
                        <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg-secondary)' }}>
                          <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Transactions</h4>
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Equity</th>
                                <th style={{ textAlign: 'right' }}>Shares</th>
                                <th style={{ textAlign: 'right' }}>Dividend / Share</th>
                                <th style={{ textAlign: 'right' }}>Total Dividend</th>
                                <th style={{ textAlign: 'right' }}>Price / Share</th>
                                <th style={{ textAlign: 'right' }}>Total Price</th>
                                <th>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Combine and sort all transactions by date */}
                              {(() => {
                                // Calculate purchase aggregates by symbol for dividend rows
                                const purchasesBySymbol = new Map<string, { totalShares: number; totalCost: number }>();
                                data.purchaseTransactions.forEach(p => {
                                  const existing = purchasesBySymbol.get(p.symbol) || { totalShares: 0, totalCost: 0 };
                                  purchasesBySymbol.set(p.symbol, {
                                    totalShares: existing.totalShares + p.shares,
                                    totalCost: existing.totalCost + p.totalCost
                                  });
                                });

                                return [
                                  ...data.dividendTransactions.map(t => ({ ...t, type: 'dividend' as const })),
                                  ...data.purchaseTransactions.map(t => ({ ...t, type: 'purchase' as const }))
                                ]
                                  .sort((a, b) => b.date.localeCompare(a.date))
                                  .map((transaction) => {
                                    // For dividend rows, get purchase aggregates for the same symbol
                                    const purchaseAgg = transaction.type === 'dividend'
                                      ? purchasesBySymbol.get(transaction.symbol)
                                      : null;
                                    const avgPricePerShare = purchaseAgg && purchaseAgg.totalShares > 0
                                      ? purchaseAgg.totalCost / purchaseAgg.totalShares
                                      : null;

                                    return (
                                      <tr key={`${transaction.type}-${transaction.id}`}>
                                        <td>{formatDate(transaction.date)}</td>
                                        <td>
                                          {transaction.type === 'dividend' ? (
                                            <div>
                                              <div className="table-cell__main">{transaction.name}</div>
                                              <div className="table-cell__meta">{transaction.symbol}</div>
                                            </div>
                                          ) : (
                                            <div className="table-cell__meta">{transaction.symbol}</div>
                                          )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                          {transaction.type === 'dividend'
                                            ? transaction.shares.toFixed(2)
                                            : transaction.shares.toFixed(2)
                                          }
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                          {transaction.type === 'dividend'
                                            ? formatCurrency(transaction.amountPerShare)
                                            : '—'
                                          }
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                          {transaction.type === 'dividend'
                                            ? formatCurrency(transaction.totalAmount)
                                            : '—'
                                          }
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                          {transaction.type === 'purchase'
                                            ? formatCurrency(transaction.pricePerShare)
                                            : avgPricePerShare !== null
                                            ? formatCurrency(avgPricePerShare)
                                            : '—'
                                          }
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                          {transaction.type === 'purchase'
                                            ? formatCurrency(transaction.totalCost)
                                            : purchaseAgg
                                            ? formatCurrency(purchaseAgg.totalCost)
                                            : '—'
                                          }
                                        </td>
                                        <td>
                                          {transaction.type === 'dividend' && (
                                            <button
                                              type="button"
                                              className="button-ghost button-ghost--danger"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const shouldDelete = window.confirm(
                                                  `Delete dividend payment of ${formatCurrency(transaction.totalAmount)} from ${transaction.name}?`
                                                );
                                                if (shouldDelete) {
                                                  removeDividend(transaction.symbol, transaction.id);
                                                }
                                              }}
                                            >
                                              Delete
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  });
                              })()}
                            </tbody>
                          </table>
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
              <td><strong>Total</strong></td>
              <td style={{ textAlign: 'right' }}><strong>{formatCurrency(totals.totalCashInvested)}</strong></td>
              <td style={{ textAlign: 'right' }}><strong>{formatCurrency(totals.totalDividends)}</strong></td>
              <td style={{ textAlign: 'right', color: totals.netCashFlow >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}>
                <strong>{formatCurrency(totals.netCashFlow)}</strong>
              </td>
              <td style={{ textAlign: 'right' }}>—</td>
              <td style={{ textAlign: 'right' }}>—</td>
              <td style={{ textAlign: 'right' }}><strong>{totals.totalPurchases}</strong></td>
              <td style={{ textAlign: 'right' }}><strong>{totals.totalDividendPayments}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};


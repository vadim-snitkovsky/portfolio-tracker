import { useMemo } from 'react';
import { calculateEquityMetrics, deriveEquityViews, usePortfolioStore } from '../../store/portfolioStore';
import { formatCurrency, formatPercent } from '../../utils/formatters';

export const EquityPerformanceTable: React.FC = () => {
  const snapshot = usePortfolioStore((state) => state.snapshot);
  const customLots = usePortfolioStore((state) => state.customLots);

  const data = useMemo(() => {
    return deriveEquityViews(snapshot, customLots)
      .map((view) => view.position)
      .filter((equity) => equity.shares > 0)
      .map((equity) => {
        const metrics = calculateEquityMetrics(equity);
        return {
          symbol: equity.symbol,
          name: equity.name,
          sector: equity.sector,
          shares: equity.shares,
          marketValue: metrics.marketValue,
          costBasis: metrics.costBasis,
          unrealizedPnL: metrics.marketValue - metrics.costBasis,
          totalReturn: metrics.totalReturn,
          roi: metrics.roi,
          navDecayPercent: metrics.navDecayPercent,
          navPeak: metrics.navPeak,
          currentNav: equity.navHistory[equity.navHistory.length - 1]?.value ?? equity.currentPrice
        };
      });
  }, [snapshot, customLots]);

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Shares</th>
            <th>Market Value</th>
            <th>Cost Basis</th>
            <th>Unrealized P&L</th>
            <th>Net Total Return</th>
            <th>ROI</th>
            <th>NAV Decay</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.symbol}>
              <td>
                <div className="table-cell__main">{row.symbol}</div>
                <div className="table-cell__meta">{row.name}</div>
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
              <td>{formatPercent(row.roi)}</td>
              <td>
                <div className="table-cell__main">{formatPercent(row.navDecayPercent)}</div>
                <div className="table-cell__meta">Peak {formatCurrency(row.navPeak)} → Now {formatCurrency(row.currentNav)}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

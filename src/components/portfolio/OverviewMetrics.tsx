import { useMemo } from 'react';
import {
  calculatePortfolioMetrics,
  deriveEquityViews,
  usePortfolioStore
} from '../../store/portfolioStore';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { MetricTile } from '../common/MetricTile';

export const OverviewMetrics: React.FC = () => {
  const snapshot = usePortfolioStore((state) => state.snapshot);
  const customLots = usePortfolioStore((state) => state.customLots);

  const activePositions = useMemo(() => {
    const views = deriveEquityViews(snapshot, customLots);
    return views
      .map((view) => view.position)
      .filter((position) => position.shares > 0);
  }, [snapshot, customLots]);

  const metrics = useMemo(() => calculatePortfolioMetrics(activePositions), [activePositions]);

  return (
    <div className="metric-grid">
      <MetricTile label="Market Value" value={formatCurrency(metrics.totalMarketValue)} />
      <MetricTile label="Cost Basis" value={formatCurrency(metrics.totalCostBasis)} />
      <MetricTile label="Unrealized P&L" value={formatCurrency(metrics.totalReturn - metrics.totalDividends)} />
      <MetricTile
        label="Net Total Return"
        value={formatCurrency(metrics.totalReturn)}
        trend={{
          label: `${metrics.totalReturn >= 0 ? '+' : ''}${formatPercent(metrics.roi)}`,
          positive: metrics.totalReturn >= 0
        }}
      />
      <MetricTile
        label="Dividends Collected"
        value={formatCurrency(metrics.totalDividends)}
        trend={{
          label: `${formatPercent(metrics.incomeYieldOnCost)} YOC`,
          positive: true
        }}
      />
    </div>
  );
};

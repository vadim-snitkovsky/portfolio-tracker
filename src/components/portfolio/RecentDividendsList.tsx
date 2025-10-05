import { useMemo } from 'react';
import { calculateEquityMetrics, deriveEquityViews, usePortfolioStore } from '../../store/portfolioStore';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const RecentDividendsList: React.FC = () => {
  const snapshot = usePortfolioStore((state) => state.snapshot);
  const customLots = usePortfolioStore((state) => state.customLots);

  const activeViews = useMemo(
    () =>
      deriveEquityViews(snapshot, customLots).filter((view) => view.position.shares > 0),
    [snapshot, customLots]
  );

  const payouts = useMemo(() => {
    return activeViews
      .flatMap((view) =>
        view.position.dividends.map((dividend) => ({
          symbol: view.position.symbol,
          name: view.position.name,
          amountPerShare: dividend.amountPerShare,
          totalAmount: dividend.amountPerShare * view.position.shares,
          date: dividend.date
        }))
      )
      .sort((a, b) => Number(new Date(b.date)) - Number(new Date(a.date)))
      .slice(0, 8);
  }, [activeViews]);

  const trailingIncome = useMemo(
    () =>
      activeViews.reduce((acc, view) => {
        const metrics = calculateEquityMetrics(view.position);
        return acc + metrics.totalDividends;
      }, 0),
    [activeViews]
  );

  return (
    <div className="recent-dividends">
      <header className="recent-dividends__header">
        <h4>Recent Payouts</h4>
        <span>{formatCurrency(trailingIncome)} in trailing income</span>
      </header>
      <ul className="recent-dividends__list">
        {payouts.map((payout) => (
          <li key={`${payout.symbol}-${payout.date}`}>
            <div>
              <div className="recent-dividends__symbol">{payout.symbol}</div>
              <div className="recent-dividends__name">{payout.name}</div>
            </div>
            <div className="recent-dividends__details">
              <span>{formatCurrency(payout.totalAmount)}</span>
              <span>{formatDate(payout.date)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

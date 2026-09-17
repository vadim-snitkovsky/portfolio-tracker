import { useMemo } from 'react';
import { deriveEquityViews, usePortfolioStore } from '../../store/portfolioStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { trailingTwelveMonthDividends } from '../../utils/portfolioMath';

export const RecentDividendsList: React.FC = () => {
  const snapshot = usePortfolioStore(state => state.snapshot);
  const customLots = usePortfolioStore(state => state.customLots);

  const activeViews = useMemo(
    () => deriveEquityViews(snapshot, customLots).filter(view => view.position.shares > 0),
    [snapshot, customLots]
  );

  // The eight most recent payments, each sized by the shares owned before its ex-dividend date.
  const payouts = useMemo(
    () =>
      activeViews
        .flatMap(view =>
          view.dividendsWithShares.map(dividend => ({
            id: dividend.id,
            symbol: view.position.symbol,
            name: view.position.name,
            totalAmount: dividend.amountPerShare * dividend.sharesOwned,
            date: dividend.date,
          }))
        )
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 8),
    [activeViews]
  );

  const trailingIncome = useMemo(
    () => trailingTwelveMonthDividends(activeViews, new Date()),
    [activeViews]
  );

  return (
    <div className="recent-dividends">
      <header className="recent-dividends__header">
        <h4>Recent Payouts</h4>
        <span>{formatCurrency(trailingIncome)} in trailing 12-month income</span>
      </header>
      <ul className="recent-dividends__list">
        {payouts.map(payout => (
          <li key={`${payout.symbol}-${payout.id}`}>
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

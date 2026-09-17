import { useMemo, useCallback } from 'react';
import { usePortfolioStore } from '../../store/portfolioStore';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { readSnapshotFile } from '../../utils/portfolioImport';
import { calculateStrategyComparison, type FundingDebugEvent } from '../../utils/strategyAnalysis';

export const StrategyAnalysis: React.FC = () => {
  const snapshot = usePortfolioStore(state => state.snapshot);
  const customLots = usePortfolioStore(state => state.customLots);

  const comparison = useMemo(
    () => calculateStrategyComparison(snapshot, customLots),
    [snapshot, customLots]
  );

  const seedAmount = snapshot.seedAmount ?? 0;
  const loadPortfolio = usePortfolioStore(state => state.loadPortfolio);
  const handleLoadFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const { snapshot: snap, customLots: lots } = await readSnapshotFile(file);
        loadPortfolio(snap, lots);
      } catch (err) {
        console.error('Failed to load portfolio JSON', err);
        alert('Failed to load portfolio JSON: ' + (err as Error).message);
      }
    },
    [loadPortfolio]
  );

  if (seedAmount <= 0) {
    return (
      <div className="strategy-analysis">
        <div className="empty-state">
          <p>Set your initial seed amount to see dividend strategy comparison.</p>
          <p className="text-sm text-gray-600">
            Go to Cash Flow & Investment tab to set your seed amount.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="strategy-analysis">
      {/* Loader for portfolio JSON */}
      <div className="debug-loader" style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 600, marginRight: 8 }}>Load Portfolio JSON:</label>
        <input type="file" accept="application/json" onChange={handleLoadFile} />
        <span className="hint" style={{ marginLeft: 8, color: '#666' }}>
          Replaces current snapshot and lots in this session.
        </span>
      </div>

      {/* Debug Section */}
      <details style={{ marginBottom: 16 }} open>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
          Debug: Classification & Totals
        </summary>
        <div style={{ padding: '8px 0' }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div>
                Seed Amount: <b>{formatCurrency(seedAmount)}</b>
              </div>
              <div>
                Total Dividends Received (all):{' '}
                <b>{formatCurrency(comparison.totalDividendsReceived)}</b>
              </div>
              <div>
                Dividends Reinvested (cost): <b>{formatCurrency(comparison.dividendsReinvested)}</b>
              </div>
              <div>
                Dividends from Reinvested Holdings:{' '}
                <b>{formatCurrency(comparison.dividendsFromReinvestedHoldings)}</b>
              </div>
            </div>
            <div>
              <div>
                Current Portfolio Value: <b>{formatCurrency(comparison.current.portfolioValue)}</b>
              </div>
              <div>
                Current Cash Balance: <b>{formatCurrency(comparison.current.cashBalance)}</b>
              </div>
              <div>
                Current Total Value: <b>{formatCurrency(comparison.current.totalValue)}</b>
              </div>
            </div>
            <div>
              <div>
                Collection Portfolio Value:{' '}
                <b>{formatCurrency(comparison.collection.portfolioValue)}</b>
              </div>
              <div>
                Collection Cash Balance: <b>{formatCurrency(comparison.collection.cashBalance)}</b>
              </div>
              <div>
                Collection Total Value: <b>{formatCurrency(comparison.collection.totalValue)}</b>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              Funding Classification Timeline (first 25)
            </div>
            <table className="comparison-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Symbol</th>
                  <th>Cost</th>
                  <th>Seed Spent Before</th>
                  <th>Seed Spent After</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {comparison.debugEvents.slice(0, 25).map((ev: FundingDebugEvent) => (
                  <tr key={ev.id}>
                    <td>{ev.tradeDate}</td>
                    <td>{ev.symbol}</td>
                    <td>{formatCurrency(ev.cost)}</td>
                    <td>{formatCurrency(ev.seedSpentBefore)}</td>
                    <td>{formatCurrency(ev.seedSpentAfter)}</td>
                    <td>{ev.decidedFunding}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>

      {/* Summary Card */}
      <div className="strategy-summary">
        <h2>Dividend Reinvestment Impact</h2>
        <div className="impact-highlight">
          <div className="impact-value">
            <span className="label">Your Reinvestment Benefit</span>
            <span
              className={`value ${comparison.reinvestmentBenefit >= 0 ? 'positive' : 'negative'}`}
            >
              {comparison.reinvestmentBenefit >= 0 ? '+' : ''}
              {formatCurrency(comparison.reinvestmentBenefit)}
            </span>
            <span className="percentage">
              ({comparison.reinvestmentBenefit >= 0 ? '+' : ''}
              {formatPercent(comparison.roiDifference)})
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Comparison Table */}
      <div className="comparison-table-container">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>
                Current Strategy
                <br />
                <span className="subtitle">(Reinvested)</span>
              </th>
              <th>
                Collection Strategy
                <br />
                <span className="subtitle">(What-If)</span>
              </th>
              <th>Difference</th>
            </tr>
          </thead>
          <tbody>
            {/* Initial Investment */}
            <tr className="section-header">
              <td colSpan={4}>Starting Position</td>
            </tr>
            <tr>
              <td>Initial Investment</td>
              <td>{formatCurrency(comparison.initialInvestment)}</td>
              <td>{formatCurrency(comparison.initialInvestment)}</td>
              <td className="neutral">{formatCurrency(0)}</td>
            </tr>
            <tr>
              <td>Total Contributed (seed + external deposits)</td>
              <td>{formatCurrency(comparison.contributions)}</td>
              <td>{formatCurrency(comparison.contributions)}</td>
              <td className="neutral">{formatCurrency(0)}</td>
            </tr>

            {/* Dividends */}
            <tr className="section-header">
              <td colSpan={4}>Dividend Activity</td>
            </tr>
            <tr>
              <td>Total Dividends Received</td>
              <td>{formatCurrency(comparison.totalDividendsReceived)}</td>
              <td>{formatCurrency(comparison.totalDividendsReceived)}</td>
              <td className="neutral">{formatCurrency(0)}</td>
            </tr>
            <tr>
              <td>Dividends Reinvested</td>
              <td>{formatCurrency(comparison.dividendsReinvested)}</td>
              <td>{formatCurrency(0)}</td>
              <td className="positive">+{formatCurrency(comparison.dividendsReinvested)}</td>
            </tr>
            <tr>
              <td>Dividends from Reinvested Holdings</td>
              <td>{formatCurrency(comparison.dividendsFromReinvestedHoldings)}</td>
              <td>{formatCurrency(0)}</td>
              <td className="positive">
                +{formatCurrency(comparison.dividendsFromReinvestedHoldings)}
              </td>
            </tr>
            <tr>
              <td>Dividends Kept as Cash</td>
              <td>{formatCurrency(comparison.current.dividendsKeptAsCash)}</td>
              <td>{formatCurrency(comparison.collection.dividendsKeptAsCash)}</td>
              <td
                className={
                  comparison.current.dividendsKeptAsCash < comparison.collection.dividendsKeptAsCash
                    ? 'negative'
                    : 'neutral'
                }
              >
                {formatCurrency(
                  comparison.current.dividendsKeptAsCash - comparison.collection.dividendsKeptAsCash
                )}
              </td>
            </tr>

            {/* Current Position */}
            <tr className="section-header">
              <td colSpan={4}>Current Position</td>
            </tr>
            <tr>
              <td>Portfolio Market Value</td>
              <td>{formatCurrency(comparison.current.portfolioValue)}</td>
              <td>{formatCurrency(comparison.collection.portfolioValue)}</td>
              <td
                className={
                  comparison.current.portfolioValue > comparison.collection.portfolioValue
                    ? 'positive'
                    : 'negative'
                }
              >
                {comparison.current.portfolioValue > comparison.collection.portfolioValue
                  ? '+'
                  : ''}
                {formatCurrency(
                  comparison.current.portfolioValue - comparison.collection.portfolioValue
                )}
              </td>
            </tr>
            <tr>
              <td>Cash Balance</td>
              <td>{formatCurrency(comparison.current.cashBalance)}</td>
              <td>{formatCurrency(comparison.collection.cashBalance)}</td>
              <td
                className={
                  comparison.current.cashBalance > comparison.collection.cashBalance
                    ? 'positive'
                    : 'negative'
                }
              >
                {comparison.current.cashBalance > comparison.collection.cashBalance ? '+' : ''}
                {formatCurrency(comparison.current.cashBalance - comparison.collection.cashBalance)}
              </td>
            </tr>
            <tr className="highlight-row">
              <td>
                <strong>Total Account Value</strong>
              </td>
              <td>
                <strong>{formatCurrency(comparison.current.totalValue)}</strong>
              </td>
              <td>
                <strong>{formatCurrency(comparison.collection.totalValue)}</strong>
              </td>
              <td className={comparison.valueDifference >= 0 ? 'positive' : 'negative'}>
                <strong>
                  {comparison.valueDifference >= 0 ? '+' : ''}
                  {formatCurrency(comparison.valueDifference)}
                </strong>
              </td>
            </tr>

            {/* Performance Metrics */}
            <tr className="section-header">
              <td colSpan={4}>Performance Metrics</td>
            </tr>
            <tr>
              <td>True ROI</td>
              <td>{formatPercent(comparison.current.trueROI)}</td>
              <td>{formatPercent(comparison.collection.trueROI)}</td>
              <td className={comparison.roiDifference >= 0 ? 'positive' : 'negative'}>
                {comparison.roiDifference >= 0 ? '+' : ''}
                {formatPercent(comparison.roiDifference)}
              </td>
            </tr>
            <tr>
              <td>Trailing 12-Month Dividends</td>
              <td>{formatCurrency(comparison.current.trailingDividends)}</td>
              <td>{formatCurrency(comparison.collection.trailingDividends)}</td>
              <td
                className={
                  comparison.current.trailingDividends >= comparison.collection.trailingDividends
                    ? 'positive'
                    : 'negative'
                }
              >
                {comparison.current.trailingDividends >= comparison.collection.trailingDividends
                  ? '+'
                  : ''}
                {formatCurrency(
                  comparison.current.trailingDividends - comparison.collection.trailingDividends
                )}
              </td>
            </tr>
            <tr>
              <td>Trailing 12-Month Dividend Yield</td>
              <td>{formatPercent(comparison.current.dividendYield)}</td>
              <td>{formatPercent(comparison.collection.dividendYield)}</td>
              <td
                className={
                  comparison.current.dividendYield > comparison.collection.dividendYield
                    ? 'positive'
                    : 'negative'
                }
              >
                {comparison.current.dividendYield > comparison.collection.dividendYield ? '+' : ''}
                {formatPercent(
                  comparison.current.dividendYield - comparison.collection.dividendYield
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Explanation */}
      <div className="strategy-explanation">
        <h3>Understanding the Comparison</h3>
        <div className="explanation-grid">
          <div className="explanation-card">
            <h4>Current Strategy (Reinvested)</h4>
            <p>
              Your actual portfolio where dividends have been used to purchase additional shares.
            </p>
            <ul>
              <li>Benefits from compound growth</li>
              <li>Increases future dividend income</li>
              <li>Higher portfolio value over time</li>
            </ul>
          </div>
          <div className="explanation-card">
            <h4>Collection Strategy (What-If)</h4>
            <p>
              Hypothetical scenario where all dividends were kept as cash instead of reinvested.
            </p>
            <ul>
              <li>More liquid cash available</li>
              <li>Same dividend yield on original holdings</li>
              <li>No compound growth from reinvestment</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

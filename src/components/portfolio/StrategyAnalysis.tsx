import { useMemo, useCallback } from 'react';
import { usePortfolioStore, calculatePortfolioMetrics, deriveEquityViews } from '../../store/portfolioStore';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { readSnapshotFile } from '../../utils/portfolioImport';
import type { PurchaseLot, PortfolioSnapshot } from '../../types/portfolio';

interface StrategyComparison {
  // Common
  initialInvestment: number;
  totalDividendsReceived: number;

  // Current Strategy (Reinvested)
  currentPortfolioValue: number;
  currentCashBalance: number;
  currentTotalValue: number;
  currentTrueROI: number;
  currentAnnualDividends: number;
  currentDividendYield: number;
  dividendsReinvested: number;
  dividendsFromReinvestedHoldings: number;

  // Collection Strategy (What-If)
  collectionPortfolioValue: number;
  collectionCashBalance: number;
  collectionTotalValue: number;
  collectionTrueROI: number;
  collectionAnnualDividends: number;
  collectionDividendYield: number;

  // Differences
  valueDifference: number;
  roiDifference: number;
  reinvestmentBenefit: number;
  debugEvents: FundingDebugEvent[];
}

// Heuristic: any purchase after total cost exceeds seedAmount is considered dividend-funded
// Explicit fundingSource is respected; we only infer when undefined
type FundingDebugEvent = {
  id: string;
  symbol: string;
  tradeDate: string;
  cost: number;
  cumulativeBefore: number;
  cumulativeAfter: number;
  decidedFunding: 'explicit-dividend' | 'explicit-seed' | 'explicit-external' | 'inferred-seed' | 'inferred-dividend';
};

function splitLotsByFunding(
  snapshot: PortfolioSnapshot,
  lots: PurchaseLot[]
): { baseLots: PurchaseLot[]; dividendLots: PurchaseLot[]; debugEvents: FundingDebugEvent[] } {
  const seed = snapshot.seedAmount ?? 0;
  const sorted = [...lots].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));

  let cumulative = 0;
  const baseLots: PurchaseLot[] = [];
  const dividendLots: PurchaseLot[] = [];
  const debugEvents: FundingDebugEvent[] = [];

  for (const lot of sorted) {
    const cost = lot.shares * lot.pricePerShare;
    const before = cumulative;

    if (lot.fundingSource === 'dividend') {
      dividendLots.push(lot);
      cumulative += cost;
      debugEvents.push({ id: lot.id, symbol: lot.symbol, tradeDate: lot.tradeDate, cost, cumulativeBefore: before, cumulativeAfter: cumulative, decidedFunding: 'explicit-dividend' });
      continue;
    }
    if (lot.fundingSource === 'seed') {
      baseLots.push(lot);
      cumulative += cost;
      debugEvents.push({ id: lot.id, symbol: lot.symbol, tradeDate: lot.tradeDate, cost, cumulativeBefore: before, cumulativeAfter: cumulative, decidedFunding: 'explicit-seed' });
      continue;
    }
    if (lot.fundingSource === 'external') {
      baseLots.push(lot);
      cumulative += cost;
      debugEvents.push({ id: lot.id, symbol: lot.symbol, tradeDate: lot.tradeDate, cost, cumulativeBefore: before, cumulativeAfter: cumulative, decidedFunding: 'explicit-external' });
      continue;
    }

    // fundingSource is undefined: infer based on seed spend
    if (cumulative >= seed) {
      const decided = { ...lot, fundingSource: 'dividend' as const };
      dividendLots.push(decided);
      cumulative += cost;
      debugEvents.push({ id: lot.id, symbol: lot.symbol, tradeDate: lot.tradeDate, cost, cumulativeBefore: before, cumulativeAfter: cumulative, decidedFunding: 'inferred-dividend' });
    } else if (cumulative + cost <= seed) {
      const decided = { ...lot, fundingSource: 'seed' as const };
      baseLots.push(decided);
      cumulative += cost;
      debugEvents.push({ id: lot.id, symbol: lot.symbol, tradeDate: lot.tradeDate, cost, cumulativeBefore: before, cumulativeAfter: cumulative, decidedFunding: 'inferred-seed' });
    } else {
      // Crossing the threshold: treat entire lot as dividend-funded (cannot split lot)
      const decided = { ...lot, fundingSource: 'dividend' as const };
      dividendLots.push(decided);
      cumulative += cost;
      debugEvents.push({ id: lot.id, symbol: lot.symbol, tradeDate: lot.tradeDate, cost, cumulativeBefore: before, cumulativeAfter: cumulative, decidedFunding: 'inferred-dividend' });
    }
  }

  return { baseLots, dividendLots, debugEvents };
}

const calculateStrategyComparison = (
  snapshot: PortfolioSnapshot,
  customLots: PurchaseLot[]
): StrategyComparison => {
  const seedAmount = snapshot.seedAmount ?? 0;

  // Separate lots by funding source using seed-spent heuristic
  const { baseLots, dividendLots, debugEvents } = splitLotsByFunding(snapshot, customLots);

  // CURRENT STRATEGY (Actual) - All holdings
  const allViews = deriveEquityViews(snapshot, customLots);

  // Calculate total dividends from ALL holdings (to date)
  const totalDividendsReceived = allViews.reduce((sum: number, view) => {
    const dividendTotal = view.dividendsWithShares.reduce((divSum: number, div) =>
      divSum + (div.amountPerShare * div.sharesOwned), 0
    );
    return sum + dividendTotal;
  }, 0);

  // Calculate current portfolio value (all holdings)
  const activePositions = allViews
    .filter(view => view.position.shares > 0)
    .map(view => view.position);
  const currentMetrics = calculatePortfolioMetrics(activePositions);
  const currentPortfolioValue = currentMetrics.totalMarketValue;

  // How much was spent on reinvestment
  const dividendsReinvested = dividendLots.reduce((sum, lot) =>
    sum + (lot.shares * lot.pricePerShare), 0
  );

  // Dividends kept as cash in current strategy
  const currentCashBalance = totalDividendsReceived - dividendsReinvested;
  const currentTotalValue = currentPortfolioValue + currentCashBalance;
  const currentTrueROI = seedAmount > 0
    ? ((currentPortfolioValue - seedAmount) / seedAmount) * 100
    : 0;

  // Calculate current annual dividends and yield
  const currentAnnualDividends = totalDividendsReceived;
  const currentDividendYield = currentPortfolioValue > 0
    ? (currentAnnualDividends / currentPortfolioValue) * 100
    : 0;

  // COLLECTION STRATEGY (What-If) - Only base-funded holdings (seed + external)
  const baseViews = deriveEquityViews(snapshot, baseLots);

  // Calculate dividends from BASE-funded holdings only (to date)
  const baseDividends = baseViews.reduce((sum: number, view) => {
    const dividendTotal = view.dividendsWithShares.reduce((divSum: number, div) =>
      divSum + (div.amountPerShare * div.sharesOwned), 0
    );
    return sum + dividendTotal;
  }, 0);

  // Calculate what-if portfolio value (base-funded holdings only)
  const collectionPositions = baseViews
    .filter(view => view.position.shares > 0)
    .map(view => view.position);
  const collectionMetrics = calculatePortfolioMetrics(collectionPositions);
  const collectionPortfolioValue = collectionMetrics.totalMarketValue;

  // In collection strategy, all dividends would be kept as cash
  const collectionCashBalance = baseDividends;
  const collectionTotalValue = collectionPortfolioValue + collectionCashBalance;
  const collectionTrueROI = seedAmount > 0
    ? ((collectionPortfolioValue - seedAmount) / seedAmount) * 100
    : 0;

  // Annual dividends from base-funded holdings only
  const collectionAnnualDividends = baseDividends;
  const collectionDividendYield = collectionPortfolioValue > 0
    ? (collectionAnnualDividends / collectionPortfolioValue) * 100
    : 0;

  // CALCULATE DIVIDENDS FROM DIVIDEND-FUNDED HOLDINGS
  // This is the key insight: dividends from reinvested positions
  const dividendOnlyViews = deriveEquityViews(snapshot, dividendLots);

  const dividendsFromReinvestedHoldings = dividendOnlyViews.reduce((sum: number, view) => {
    const dividendTotal = view.dividendsWithShares.reduce((divSum: number, div) =>
      divSum + (div.amountPerShare * div.sharesOwned), 0
    );
    return sum + dividendTotal;
  }, 0);


  // DIFFERENCES
  const valueDifference = currentTotalValue - collectionTotalValue;
  const roiDifference = currentTrueROI - collectionTrueROI;
  const reinvestmentBenefit = valueDifference;

  return {
    initialInvestment: seedAmount,
    totalDividendsReceived,
    currentPortfolioValue,
    currentCashBalance,
    currentTotalValue,
    currentTrueROI,
    currentAnnualDividends,
    currentDividendYield,
    dividendsReinvested,
    dividendsFromReinvestedHoldings,
    collectionPortfolioValue,
    collectionCashBalance,
    collectionTotalValue,
    collectionTrueROI,
    collectionAnnualDividends,
    collectionDividendYield,
    valueDifference,
    roiDifference,
    reinvestmentBenefit,
    debugEvents,
  };
};

export const StrategyAnalysis: React.FC = () => {
  const snapshot = usePortfolioStore(state => state.snapshot);
  const customLots = usePortfolioStore(state => state.customLots);

  const comparison = useMemo(() =>
    calculateStrategyComparison(snapshot, customLots),
    [snapshot, customLots]
  );

  const seedAmount = snapshot.seedAmount ?? 0;
  const loadPortfolio = usePortfolioStore(state => state.loadPortfolio);
  const handleLoadFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { snapshot: snap, customLots: lots } = await readSnapshotFile(file);
      loadPortfolio(snap, lots);
    } catch (err) {
      console.error('Failed to load portfolio JSON', err);
      alert('Failed to load portfolio JSON: ' + (err as Error).message);
    }
  }, [loadPortfolio]);


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
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Debug: Classification & Totals</summary>
        <div style={{ padding: '8px 0' }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div>Seed Amount: <b>{formatCurrency(seedAmount)}</b></div>
              <div>Total Dividends Received (all): <b>{formatCurrency(comparison.totalDividendsReceived)}</b></div>
              <div>Dividends Reinvested (cost): <b>{formatCurrency(comparison.dividendsReinvested)}</b></div>
              <div>Dividends from Reinvested Holdings: <b>{formatCurrency(comparison.dividendsFromReinvestedHoldings)}</b></div>
            </div>
            <div>
              <div>Current Portfolio Value: <b>{formatCurrency(comparison.currentPortfolioValue)}</b></div>
              <div>Current Cash Balance: <b>{formatCurrency(comparison.currentCashBalance)}</b></div>
              <div>Current Total Value: <b>{formatCurrency(comparison.currentTotalValue)}</b></div>
            </div>
            <div>
              <div>Collection Portfolio Value: <b>{formatCurrency(comparison.collectionPortfolioValue)}</b></div>
              <div>Collection Cash Balance: <b>{formatCurrency(comparison.collectionCashBalance)}</b></div>
              <div>Collection Total Value: <b>{formatCurrency(comparison.collectionTotalValue)}</b></div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Funding Classification Timeline (first 25)</div>
            <table className="comparison-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Symbol</th>
                  <th>Cost</th>
                  <th>Cumulative Before</th>
                  <th>Cumulative After</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {comparison.debugEvents.slice(0, 25).map((ev: FundingDebugEvent) => (
                  <tr key={ev.id}>
                    <td>{ev.tradeDate}</td>
                    <td>{ev.symbol}</td>
                    <td>{formatCurrency(ev.cost)}</td>
                    <td>{formatCurrency(ev.cumulativeBefore)}</td>
                    <td>{formatCurrency(ev.cumulativeAfter)}</td>
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
            <span className={`value ${comparison.reinvestmentBenefit >= 0 ? 'positive' : 'negative'}`}>
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
              <th>Current Strategy<br/><span className="subtitle">(Reinvested)</span></th>
              <th>Collection Strategy<br/><span className="subtitle">(What-If)</span></th>
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
              <td className="positive">+{formatCurrency(comparison.dividendsFromReinvestedHoldings)}</td>
            </tr>
            <tr>
              <td>Dividends Kept as Cash</td>
              <td>{formatCurrency(comparison.currentCashBalance)}</td>
              <td>{formatCurrency(comparison.collectionCashBalance)}</td>
              <td className={comparison.currentCashBalance < comparison.collectionCashBalance ? 'negative' : 'neutral'}>
                {formatCurrency(comparison.currentCashBalance - comparison.collectionCashBalance)}
              </td>
            </tr>

            {/* Current Position */}
            <tr className="section-header">
              <td colSpan={4}>Current Position</td>
            </tr>
            <tr>
              <td>Portfolio Market Value</td>
              <td>{formatCurrency(comparison.currentPortfolioValue)}</td>
              <td>{formatCurrency(comparison.collectionPortfolioValue)}</td>
              <td className={comparison.currentPortfolioValue > comparison.collectionPortfolioValue ? 'positive' : 'negative'}>
                {comparison.currentPortfolioValue > comparison.collectionPortfolioValue ? '+' : ''}
                {formatCurrency(comparison.currentPortfolioValue - comparison.collectionPortfolioValue)}
              </td>
            </tr>
            <tr>
              <td>Cash Balance</td>
              <td>{formatCurrency(comparison.currentCashBalance)}</td>
              <td>{formatCurrency(comparison.collectionCashBalance)}</td>
              <td className={comparison.currentCashBalance > comparison.collectionCashBalance ? 'positive' : 'negative'}>
                {comparison.currentCashBalance > comparison.collectionCashBalance ? '+' : ''}
                {formatCurrency(comparison.currentCashBalance - comparison.collectionCashBalance)}
              </td>
            </tr>
            <tr className="highlight-row">
              <td><strong>Total Account Value</strong></td>
              <td><strong>{formatCurrency(comparison.currentTotalValue)}</strong></td>
              <td><strong>{formatCurrency(comparison.collectionTotalValue)}</strong></td>
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
              <td>{formatPercent(comparison.currentTrueROI)}</td>
              <td>{formatPercent(comparison.collectionTrueROI)}</td>
              <td className={comparison.roiDifference >= 0 ? 'positive' : 'negative'}>
                {comparison.roiDifference >= 0 ? '+' : ''}
                {formatPercent(comparison.roiDifference)}
              </td>
            </tr>
            <tr>
              <td>Portfolio Dividend Yield</td>
              <td>{formatPercent(comparison.currentDividendYield)}</td>
              <td>{formatPercent(comparison.collectionDividendYield)}</td>
              <td className={comparison.currentDividendYield > comparison.collectionDividendYield ? 'positive' : 'negative'}>
                {comparison.currentDividendYield > comparison.collectionDividendYield ? '+' : ''}
                {formatPercent(comparison.currentDividendYield - comparison.collectionDividendYield)}
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
            <p>Your actual portfolio where dividends have been used to purchase additional shares.</p>
            <ul>
              <li>Benefits from compound growth</li>
              <li>Increases future dividend income</li>
              <li>Higher portfolio value over time</li>
            </ul>
          </div>
          <div className="explanation-card">
            <h4>Collection Strategy (What-If)</h4>
            <p>Hypothetical scenario where all dividends were kept as cash instead of reinvested.</p>
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


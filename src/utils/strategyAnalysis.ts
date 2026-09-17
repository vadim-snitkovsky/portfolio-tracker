import type { PortfolioSnapshot, PurchaseLot } from '../types/portfolio';
import {
  calculatePortfolioMetrics,
  deriveEquityViews,
  type EquityWithLots,
} from '../store/portfolioStore';
import {
  lotCost,
  summarizeAccount,
  totalDividendsReceived,
  totalInvested,
  trailingTwelveMonthDividends,
} from './portfolioMath';

export type FundingDecision =
  | 'explicit-dividend'
  | 'explicit-seed'
  | 'explicit-external'
  | 'inferred-seed'
  | 'inferred-dividend';

export interface FundingDebugEvent {
  id: string;
  symbol: string;
  tradeDate: string;
  cost: number;
  seedSpentBefore: number;
  seedSpentAfter: number;
  decidedFunding: FundingDecision;
}

export interface LotSplit {
  /** Lots paid for with seed money or an external deposit. */
  baseLots: PurchaseLot[];
  /** Lots paid for with dividends. */
  dividendLots: PurchaseLot[];
  debugEvents: FundingDebugEvent[];
}

/**
 * Decide how each lot was paid for. An explicit fundingSource always wins. Unlabeled lots are
 * inferred in trade-date order: while the seed still has room for the whole lot it is seed funded;
 * the first lot that would overspend the seed, and every unlabeled lot after it, is dividend
 * funded. Only seed-funded lots draw down the seed. Dividend and external purchases do not, so an
 * explicitly labeled lot never changes how a later unlabeled lot is classified.
 */
export function splitLotsByFunding(snapshot: PortfolioSnapshot, lots: PurchaseLot[]): LotSplit {
  const seed = snapshot.seedAmount ?? 0;
  const sorted = [...lots].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));

  let seedSpent = 0;
  const baseLots: PurchaseLot[] = [];
  const dividendLots: PurchaseLot[] = [];
  const debugEvents: FundingDebugEvent[] = [];

  for (const lot of sorted) {
    const cost = lotCost(lot);
    const before = seedSpent;

    let decision: FundingDecision;
    if (lot.fundingSource === 'dividend') decision = 'explicit-dividend';
    else if (lot.fundingSource === 'external') decision = 'explicit-external';
    else if (lot.fundingSource === 'seed') decision = 'explicit-seed';
    else if (seedSpent + cost <= seed) decision = 'inferred-seed';
    else decision = 'inferred-dividend';

    const fundedBySeed = decision === 'explicit-seed' || decision === 'inferred-seed';
    if (fundedBySeed) seedSpent += cost;

    const fundedByDividends = decision === 'explicit-dividend' || decision === 'inferred-dividend';
    const decided: PurchaseLot = lot.fundingSource
      ? lot
      : { ...lot, fundingSource: fundedByDividends ? 'dividend' : 'seed' };
    (fundedByDividends ? dividendLots : baseLots).push(decided);

    debugEvents.push({
      id: lot.id,
      symbol: lot.symbol,
      tradeDate: lot.tradeDate,
      cost,
      seedSpentBefore: before,
      seedSpentAfter: seedSpent,
      decidedFunding: decision,
    });
  }

  return { baseLots, dividendLots, debugEvents };
}

export interface StrategySide {
  portfolioValue: number;
  dividendsReceived: number;
  /** Dividends that were not spent on new shares. */
  dividendsKeptAsCash: number;
  /** Account cash: contributions - invested + dividends received. */
  cashBalance: number;
  /** portfolioValue + cashBalance */
  totalValue: number;
  /** (totalValue - contributions) / contributions, in percent. */
  trueROI: number;
  /** Dividends received in the twelve months ending on asOf. */
  trailingDividends: number;
  /** trailingDividends / portfolioValue, in percent. */
  dividendYield: number;
}

export interface StrategyComparison {
  initialInvestment: number;
  contributions: number;
  totalDividendsReceived: number;
  /** Cost of the dividend-funded lots. */
  dividendsReinvested: number;
  /** Dividends earned by the dividend-funded lots themselves. */
  dividendsFromReinvestedHoldings: number;
  current: StrategySide;
  collection: StrategySide;
  valueDifference: number;
  roiDifference: number;
  reinvestmentBenefit: number;
  debugEvents: FundingDebugEvent[];
}

const marketValueOf = (views: EquityWithLots[]): number =>
  calculatePortfolioMetrics(views.map(view => view.position).filter(p => p.shares > 0))
    .totalMarketValue;

/**
 * Compare the account as it is (dividends reinvested where the lots say so) with a what-if where
 * every dividend was kept as cash and only the seed- and external-funded lots were bought.
 * Both sides use the same contributions and the same account arithmetic as the cash flow report.
 */
export const calculateStrategyComparison = (
  snapshot: PortfolioSnapshot,
  customLots: PurchaseLot[],
  asOf: Date = new Date()
): StrategyComparison => {
  const seedAmount = snapshot.seedAmount ?? 0;
  const { baseLots, dividendLots, debugEvents } = splitLotsByFunding(snapshot, customLots);

  const side = (lots: PurchaseLot[], dividendsKeptAsCash: (received: number) => number) => {
    const views = deriveEquityViews(snapshot, lots);
    const dividendsReceived = totalDividendsReceived(views);
    const portfolioValue = marketValueOf(views);
    const account = summarizeAccount({
      seedAmount,
      lots,
      dividendsReceived,
      marketValue: portfolioValue,
    });
    const trailingDividends = trailingTwelveMonthDividends(views, asOf);
    const result: StrategySide = {
      portfolioValue,
      dividendsReceived,
      dividendsKeptAsCash: dividendsKeptAsCash(dividendsReceived),
      cashBalance: account.cashBalance,
      totalValue: account.totalValue,
      trueROI: account.returnPercent,
      trailingDividends,
      dividendYield: portfolioValue > 0 ? (trailingDividends / portfolioValue) * 100 : 0,
    };
    return { side: result, contributions: account.contributions };
  };

  const dividendsReinvested = totalInvested(dividendLots);
  const current = side(customLots, received => received - dividendsReinvested);
  const collection = side(baseLots, received => received);

  const dividendsFromReinvestedHoldings = totalDividendsReceived(
    deriveEquityViews(snapshot, dividendLots)
  );

  const valueDifference = current.side.totalValue - collection.side.totalValue;

  return {
    initialInvestment: seedAmount,
    contributions: current.contributions,
    totalDividendsReceived: current.side.dividendsReceived,
    dividendsReinvested,
    dividendsFromReinvestedHoldings,
    current: current.side,
    collection: collection.side,
    valueDifference,
    roiDifference: current.side.trueROI - collection.side.trueROI,
    reinvestmentBenefit: valueDifference,
    debugEvents,
  };
};

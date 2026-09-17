import { describe, it, expect } from 'vitest';
import type { PortfolioSnapshot, PurchaseLot } from '../types/portfolio';
import { calculateStrategyComparison, splitLotsByFunding } from './strategyAnalysis';
import { abcAsOf, abcExpected, abcLots, abcSnapshot } from '../test/fixtures';

const snapshotWithSeed = (seedAmount: number | undefined): PortfolioSnapshot => ({
  asOf: '2024-12-31',
  seedAmount,
  equityMetadata: [],
});

const lot = (
  id: string,
  tradeDate: string,
  cost: number,
  fundingSource?: PurchaseLot['fundingSource']
): PurchaseLot => ({ id, symbol: 'A', tradeDate, shares: 1, pricePerShare: cost, fundingSource });

describe('splitLotsByFunding', () => {
  it('respects explicit funding sources and infers the rest from the seed budget', () => {
    const { baseLots, dividendLots, debugEvents } = splitLotsByFunding(abcSnapshot, abcLots);
    expect(baseLots.map(l => l.id)).toEqual(['L1', 'L2', 'L4']);
    expect(dividendLots.map(l => l.id)).toEqual(['L3']);
    expect(debugEvents).toEqual([
      expect.objectContaining({
        id: 'L1',
        cost: 1000,
        seedSpentBefore: 0,
        seedSpentAfter: 1000,
        decidedFunding: 'inferred-seed',
      }),
      expect.objectContaining({
        id: 'L2',
        cost: 500,
        seedSpentBefore: 1000,
        seedSpentAfter: 1500,
        decidedFunding: 'inferred-seed',
      }),
      expect.objectContaining({
        id: 'L3',
        cost: 200,
        seedSpentBefore: 1500,
        seedSpentAfter: 1500,
        decidedFunding: 'explicit-dividend',
      }),
      expect.objectContaining({
        id: 'L4',
        cost: 300,
        seedSpentBefore: 1500,
        seedSpentAfter: 1500,
        decidedFunding: 'explicit-external',
      }),
    ]);
  });

  it('stamps inferred lots with the decided funding source and leaves explicit ones untouched', () => {
    const { baseLots, dividendLots } = splitLotsByFunding(abcSnapshot, abcLots);
    expect(baseLots.map(l => l.fundingSource)).toEqual(['seed', 'seed', 'external']);
    expect(dividendLots[0].fundingSource).toBe('dividend');
    // The caller's lots are not mutated.
    expect(abcLots[0].fundingSource).toBeUndefined();
  });

  it('classifies in trade-date order regardless of input order', () => {
    const lots = [lot('late', '2024-03-01', 600), lot('early', '2024-01-01', 600)];
    const { debugEvents } = splitLotsByFunding(snapshotWithSeed(1000), lots);
    expect(debugEvents.map(e => [e.id, e.decidedFunding])).toEqual([
      ['early', 'inferred-seed'],
      ['late', 'inferred-dividend'],
    ]);
  });

  it('calls a lot dividend funded when it would overspend the seed, and lets later lots use what is left', () => {
    const lots = [
      lot('a', '2024-01-01', 600),
      lot('b', '2024-02-01', 500), // 600 + 500 > 1000
      lot('c', '2024-03-01', 300), // 600 + 300 <= 1000
      lot('d', '2024-04-01', 200), // 900 + 200 > 1000
    ];
    const { debugEvents } = splitLotsByFunding(snapshotWithSeed(1000), lots);
    expect(debugEvents.map(e => e.decidedFunding)).toEqual([
      'inferred-seed',
      'inferred-dividend',
      'inferred-seed',
      'inferred-dividend',
    ]);
    expect(debugEvents.map(e => e.seedSpentAfter)).toEqual([600, 600, 900, 900]);
  });

  it('does not let an explicit dividend or external lot draw down the seed', () => {
    const lots = [
      lot('div', '2024-01-01', 800, 'dividend'),
      lot('ext', '2024-01-02', 700, 'external'),
      lot('later', '2024-02-01', 900),
    ];
    const { debugEvents, baseLots } = splitLotsByFunding(snapshotWithSeed(1000), lots);
    expect(debugEvents.map(e => e.decidedFunding)).toEqual([
      'explicit-dividend',
      'explicit-external',
      'inferred-seed',
    ]);
    expect(baseLots.map(l => l.id)).toEqual(['ext', 'later']);
  });

  it('lets an explicit seed lot exceed the seed and still count against it', () => {
    const lots = [lot('a', '2024-01-01', 1500, 'seed'), lot('b', '2024-02-01', 10)];
    const { debugEvents } = splitLotsByFunding(snapshotWithSeed(1000), lots);
    expect(debugEvents.map(e => e.decidedFunding)).toEqual(['explicit-seed', 'inferred-dividend']);
    expect(debugEvents[0].seedSpentAfter).toBe(1500);
  });

  it('treats every unlabeled lot as dividend funded when there is no seed', () => {
    const lots = [lot('a', '2024-01-01', 1)];
    expect(splitLotsByFunding(snapshotWithSeed(undefined), lots).dividendLots).toHaveLength(1);
    expect(splitLotsByFunding(snapshotWithSeed(0), lots).dividendLots).toHaveLength(1);
  });

  it('handles no lots', () => {
    expect(splitLotsByFunding(abcSnapshot, [])).toEqual({
      baseLots: [],
      dividendLots: [],
      debugEvents: [],
    });
  });
});

describe('calculateStrategyComparison', () => {
  const comparison = calculateStrategyComparison(abcSnapshot, abcLots, abcAsOf);

  it('reports the shared starting position', () => {
    expect(comparison.initialInvestment).toBe(10000);
    expect(comparison.contributions).toBe(abcExpected.contributions);
    expect(comparison.totalDividendsReceived).toBe(abcExpected.totalDividends);
    expect(comparison.dividendsReinvested).toBe(abcExpected.dividendsReinvested);
    expect(comparison.dividendsFromReinvestedHoldings).toBe(
      abcExpected.dividendsFromReinvestedHoldings
    );
  });

  it('values the current strategy with the same account arithmetic as the cash flow report', () => {
    expect(comparison.current.portfolioValue).toBe(abcExpected.marketValue);
    expect(comparison.current.dividendsReceived).toBe(abcExpected.totalDividends);
    expect(comparison.current.dividendsKeptAsCash).toBe(570 - 200);
    expect(comparison.current.cashBalance).toBe(abcExpected.cashBalance);
    expect(comparison.current.totalValue).toBe(abcExpected.totalValue);
    expect(comparison.current.trueROI).toBeCloseTo(abcExpected.returnPercent, 10);
    expect(comparison.current.trailingDividends).toBe(570);
    expect(comparison.current.dividendYield).toBeCloseTo((570 / 2400) * 100, 10);
  });

  it('values the collection what-if with only the seed- and external-funded lots', () => {
    const c = abcExpected.collection;
    expect(comparison.collection.portfolioValue).toBe(c.marketValue);
    expect(comparison.collection.dividendsReceived).toBe(c.dividends);
    expect(comparison.collection.dividendsKeptAsCash).toBe(c.dividends);
    expect(comparison.collection.cashBalance).toBe(c.cashBalance);
    expect(comparison.collection.totalValue).toBe(c.totalValue);
    expect(comparison.collection.trueROI).toBeCloseTo(c.returnPercent, 10);
    expect(comparison.collection.trailingDividends).toBe(530);
    expect(comparison.collection.dividendYield).toBeCloseTo((530 / 2160) * 100, 10);
  });

  it('reports the differences', () => {
    expect(comparison.valueDifference).toBe(abcExpected.valueDifference);
    expect(comparison.reinvestmentBenefit).toBe(abcExpected.valueDifference);
    expect(comparison.roiDifference).toBeCloseTo(
      abcExpected.returnPercent - abcExpected.collection.returnPercent,
      10
    );
  });

  it('equals reinvested shares at market, less what they cost, plus what they earned', () => {
    const reinvestedShares = 20;
    const identity =
      reinvestedShares * 12 -
      comparison.dividendsReinvested +
      comparison.dividendsFromReinvestedHoldings;
    expect(comparison.valueDifference).toBeCloseTo(identity, 10);
  });

  it('uses a trailing twelve month window for the yield figures', () => {
    // As of 2024-08-01 only d1..d3 count: 370 for current, 350 for collection (100 + 100 + 150).
    const earlier = calculateStrategyComparison(
      abcSnapshot,
      abcLots,
      new Date('2024-08-01T12:00:00')
    );
    expect(earlier.current.trailingDividends).toBe(370);
    expect(earlier.collection.trailingDividends).toBe(350);
    expect(earlier.current.dividendYield).toBeCloseTo((370 / 2400) * 100, 10);
  });

  it('shows no difference when nothing was reinvested', () => {
    const baseOnly = abcLots.filter(l => l.fundingSource !== 'dividend');
    const result = calculateStrategyComparison(abcSnapshot, baseOnly, abcAsOf);
    expect(result.dividendsReinvested).toBe(0);
    expect(result.valueDifference).toBe(0);
    expect(result.roiDifference).toBe(0);
    expect(result.current).toEqual(result.collection);
  });

  it('handles an empty account', () => {
    const result = calculateStrategyComparison(snapshotWithSeed(0), [], abcAsOf);
    expect(result.current.totalValue).toBe(0);
    expect(result.current.trueROI).toBe(0);
    expect(result.current.dividendYield).toBe(0);
    expect(result.debugEvents).toEqual([]);
  });
});

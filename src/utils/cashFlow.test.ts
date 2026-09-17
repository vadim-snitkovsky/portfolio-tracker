import { describe, it, expect } from 'vitest';
import { deriveEquityViews } from '../store/portfolioStore';
import { buildMonthlyCashFlow, summarizeCashFlow } from './cashFlow';
import { abcExpected, abcLots, abcSnapshot } from '../test/fixtures';

describe('cashFlow', () => {
  const views = deriveEquityViews(abcSnapshot, abcLots);
  const months = buildMonthlyCashFlow(abcLots, views);

  it('produces one row per month that had a purchase or a dividend, oldest first', () => {
    expect(months.map(m => m.month)).toEqual([
      '2024-01',
      '2024-02',
      '2024-05',
      '2024-07',
      '2024-08',
      '2024-10',
      '2024-11',
    ]);
    expect(months.map(m => m.monthLabel)).toEqual([
      'Jan 2024',
      'Feb 2024',
      'May 2024',
      'Jul 2024',
      'Aug 2024',
      'Oct 2024',
      'Nov 2024',
    ]);
  });

  it('sizes each dividend by the shares owned before its ex-date', () => {
    expect(months.map(m => m.dividendsReceived)).toEqual([0, 100, 100, 0, 170, 0, 200]);
    expect(months.map(m => m.dividendCount)).toEqual([0, 1, 1, 0, 1, 0, 1]);
    const may = months.find(m => m.month === '2024-05')!;
    expect(may.dividendTransactions).toEqual([
      {
        id: 'abc-d2',
        symbol: 'ABC',
        name: 'ABC Income Fund',
        date: '2024-05-01',
        shares: 100,
        amountPerShare: 1,
        totalAmount: 100,
      },
    ]);
  });

  it('records purchases with their cost', () => {
    expect(months.map(m => m.cashInvested)).toEqual([1000, 0, 500, 200, 0, 300, 0]);
    expect(months.map(m => m.purchaseCount)).toEqual([1, 0, 1, 1, 0, 1, 0]);
    const jan = months.find(m => m.month === '2024-01')!;
    expect(jan.purchaseTransactions).toEqual([
      {
        id: 'L1',
        symbol: 'ABC',
        date: '2024-01-15',
        shares: 100,
        pricePerShare: 10,
        totalCost: 1000,
      },
    ]);
  });

  it('keeps running totals and treats buying as an outflow', () => {
    expect(months.map(m => m.cumulativeCashInvested)).toEqual([
      1000, 1000, 1500, 1700, 1700, 2000, 2000,
    ]);
    expect(months.map(m => m.cumulativeDividends)).toEqual([0, 100, 200, 200, 370, 370, 570]);
    expect(months.map(m => m.netCashFlow)).toEqual([-1000, 100, -400, -200, 170, -300, 200]);
  });

  it('skips dividends for which no shares were owned', () => {
    // A position with dividends but no lots owns zero shares at every date.
    const noLots = buildMonthlyCashFlow([], deriveEquityViews(abcSnapshot, []));
    expect(noLots).toEqual([]);
  });

  it('summarizes totals', () => {
    expect(summarizeCashFlow(months)).toEqual({
      totalCashInvested: abcExpected.invested,
      totalDividends: abcExpected.totalDividends,
      netCashFlow: abcExpected.totalDividends - abcExpected.invested,
      totalPurchases: 4,
      totalDividendPayments: 4,
    });
    expect(summarizeCashFlow([])).toEqual({
      totalCashInvested: 0,
      totalDividends: 0,
      netCashFlow: 0,
      totalPurchases: 0,
      totalDividendPayments: 0,
    });
  });
});

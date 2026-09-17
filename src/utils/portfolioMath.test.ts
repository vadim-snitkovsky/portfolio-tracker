import { describe, it, expect } from 'vitest';
import { deriveEquityViews } from '../store/portfolioStore';
import {
  externalContributions,
  lotCost,
  sumDividendsWithShares,
  summarizeAccount,
  toIsoDate,
  totalDividendsReceived,
  totalInvested,
  trailingTwelveMonthDividends,
} from './portfolioMath';
import { abcAsOf, abcExpected, abcLots, abcSnapshot } from '../test/fixtures';

describe('portfolioMath', () => {
  describe('toIsoDate', () => {
    it('formats a local calendar date with zero padding', () => {
      expect(toIsoDate(new Date(2024, 0, 5, 23, 59))).toBe('2024-01-05');
      expect(toIsoDate(new Date(2024, 11, 31))).toBe('2024-12-31');
    });
  });

  describe('lot totals', () => {
    it('lotCost multiplies shares by price', () => {
      expect(
        lotCost({ id: 'x', symbol: 'X', tradeDate: '2024-01-01', shares: 3, pricePerShare: 2.5 })
      ).toBe(7.5);
    });

    it('totalInvested sums every lot', () => {
      expect(totalInvested(abcLots)).toBe(abcExpected.invested);
      expect(totalInvested([])).toBe(0);
    });

    it('externalContributions only counts lots funded by an external deposit', () => {
      expect(externalContributions(abcLots)).toBe(abcExpected.externalContributions);
      expect(externalContributions(abcLots.filter(lot => lot.fundingSource !== 'external'))).toBe(
        0
      );
    });
  });

  describe('dividend sums', () => {
    it('sumDividendsWithShares weights each payment by the shares owned on its date', () => {
      expect(
        sumDividendsWithShares([
          { id: 'a', date: '2024-01-01', amountPerShare: 0.5, sharesOwned: 10 },
          { id: 'b', date: '2024-02-01', amountPerShare: 0.25, sharesOwned: 40 },
        ])
      ).toBe(15);
      expect(sumDividendsWithShares([])).toBe(0);
    });

    it('totalDividendsReceived matches the hand-computed fixture', () => {
      const views = deriveEquityViews(abcSnapshot, abcLots);
      expect(totalDividendsReceived(views)).toBe(abcExpected.totalDividends);
    });
  });

  describe('trailingTwelveMonthDividends', () => {
    const views = deriveEquityViews(abcSnapshot, abcLots);

    it('includes every payment when all fall inside the window', () => {
      expect(trailingTwelveMonthDividends(views, abcAsOf)).toBe(abcExpected.totalDividends);
    });

    it('drops payments older than twelve months and keeps the one on the boundary day', () => {
      // Window is (2023-08-01, 2024-08-01]: d1, d2, d3 qualify; d4 is in the future.
      expect(trailingTwelveMonthDividends(views, new Date('2024-08-01T09:00:00'))).toBe(370);
      // Window is (2024-05-01, 2025-05-01]: d2 sits exactly on the open boundary and is excluded.
      expect(trailingTwelveMonthDividends(views, new Date('2025-05-01T09:00:00'))).toBe(370);
      // Nothing in the last year.
      expect(trailingTwelveMonthDividends(views, new Date('2026-01-01T09:00:00'))).toBe(0);
    });
  });

  describe('summarizeAccount', () => {
    it('matches the hand-computed fixture', () => {
      const summary = summarizeAccount({
        seedAmount: abcSnapshot.seedAmount!,
        lots: abcLots,
        dividendsReceived: abcExpected.totalDividends,
        marketValue: abcExpected.marketValue,
      });
      expect(summary.contributions).toBe(abcExpected.contributions);
      expect(summary.externalContributions).toBe(abcExpected.externalContributions);
      expect(summary.invested).toBe(abcExpected.invested);
      expect(summary.cashBalance).toBe(abcExpected.cashBalance);
      expect(summary.totalValue).toBe(abcExpected.totalValue);
      expect(summary.returnPercent).toBeCloseTo(abcExpected.returnPercent, 10);
      expect(summary.dividendReturnPercent).toBeCloseTo(abcExpected.dividendReturnPercent, 10);
    });

    it('counts uninvested seed and collected dividends in the return, unlike market value alone', () => {
      // Seed 1,000, bought 800 of stock now worth 800, received 50 in dividends: account is 1,050.
      const summary = summarizeAccount({
        seedAmount: 1000,
        lots: [{ id: 'a', symbol: 'A', tradeDate: '2024-01-01', shares: 8, pricePerShare: 100 }],
        dividendsReceived: 50,
        marketValue: 800,
      });
      expect(summary.cashBalance).toBe(250);
      expect(summary.totalValue).toBe(1050);
      expect(summary.returnPercent).toBeCloseTo(5, 10);
    });

    it('treats an externally funded lot as new money rather than seed spend', () => {
      const summary = summarizeAccount({
        seedAmount: 1000,
        lots: [
          { id: 'a', symbol: 'A', tradeDate: '2024-01-01', shares: 10, pricePerShare: 100 },
          {
            id: 'b',
            symbol: 'A',
            tradeDate: '2024-02-01',
            shares: 5,
            pricePerShare: 100,
            fundingSource: 'external',
          },
        ],
        dividendsReceived: 0,
        marketValue: 1500,
      });
      expect(summary.contributions).toBe(1500);
      expect(summary.cashBalance).toBe(0);
      expect(summary.returnPercent).toBe(0);
    });

    it('returns zero percentages when nothing has been contributed', () => {
      const summary = summarizeAccount({
        seedAmount: 0,
        lots: [{ id: 'a', symbol: 'A', tradeDate: '2024-01-01', shares: 1, pricePerShare: 100 }],
        dividendsReceived: 10,
        marketValue: 120,
      });
      expect(summary.contributions).toBe(0);
      expect(summary.cashBalance).toBe(-90);
      expect(summary.returnPercent).toBe(0);
      expect(summary.dividendReturnPercent).toBe(0);
    });
  });
});

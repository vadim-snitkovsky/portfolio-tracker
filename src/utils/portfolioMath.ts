import type { DividendPaymentWithShares, PurchaseLot } from '../types/portfolio';
import type { EquityWithLots } from '../store/portfolioStore';

/** Local calendar date as YYYY-MM-DD, the form every date in the app uses. */
export const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const lotCost = (lot: PurchaseLot): number => lot.shares * lot.pricePerShare;

export const totalInvested = (lots: PurchaseLot[]): number =>
  lots.reduce((sum, lot) => sum + lotCost(lot), 0);

/** Money that came from outside the account: lots marked as funded by an external deposit. */
export const externalContributions = (lots: PurchaseLot[]): number =>
  totalInvested(lots.filter(lot => lot.fundingSource === 'external'));

/** Cash received: amount per share times the shares owned before each ex-dividend date. */
export const sumDividendsWithShares = (dividends: DividendPaymentWithShares[]): number =>
  dividends.reduce((sum, dividend) => sum + dividend.amountPerShare * dividend.sharesOwned, 0);

export const totalDividendsReceived = (views: EquityWithLots[]): number =>
  views.reduce((sum, view) => sum + sumDividendsWithShares(view.dividendsWithShares), 0);

/** Dividends received in the twelve months ending on asOf, inclusive of asOf. */
export const trailingTwelveMonthDividends = (views: EquityWithLots[], asOf: Date): number => {
  const end = toIsoDate(asOf);
  const startDate = new Date(asOf);
  startDate.setFullYear(startDate.getFullYear() - 1);
  const start = toIsoDate(startDate);
  return views.reduce(
    (sum, view) =>
      sum +
      sumDividendsWithShares(
        view.dividendsWithShares.filter(dividend => dividend.date > start && dividend.date <= end)
      ),
    0
  );
};

export interface AccountInputs {
  seedAmount: number;
  lots: PurchaseLot[];
  dividendsReceived: number;
  marketValue: number;
}

export interface AccountSummary {
  /** Seed plus every external deposit. The denominator for every return figure. */
  contributions: number;
  externalContributions: number;
  invested: number;
  dividendsReceived: number;
  /** contributions - invested + dividendsReceived. Negative when lots cost more than the recorded money in. */
  cashBalance: number;
  marketValue: number;
  /** marketValue + cashBalance */
  totalValue: number;
  /** (totalValue - contributions) / contributions, in percent. 0 when nothing was contributed. */
  returnPercent: number;
  /** dividendsReceived / contributions, in percent. 0 when nothing was contributed. */
  dividendReturnPercent: number;
}

/**
 * Account-level arithmetic shared by the cash flow report and the strategy comparison, so both
 * tabs show the same cash balance and the same return for the same data.
 */
export const summarizeAccount = ({
  seedAmount,
  lots,
  dividendsReceived,
  marketValue,
}: AccountInputs): AccountSummary => {
  const external = externalContributions(lots);
  const contributions = seedAmount + external;
  const invested = totalInvested(lots);
  const cashBalance = contributions - invested + dividendsReceived;
  const totalValue = marketValue + cashBalance;
  const returnPercent =
    contributions > 0 ? ((totalValue - contributions) / contributions) * 100 : 0;
  const dividendReturnPercent = contributions > 0 ? (dividendsReceived / contributions) * 100 : 0;

  return {
    contributions,
    externalContributions: external,
    invested,
    dividendsReceived,
    cashBalance,
    marketValue,
    totalValue,
    returnPercent,
    dividendReturnPercent,
  };
};

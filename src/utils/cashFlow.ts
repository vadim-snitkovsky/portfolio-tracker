import type { PurchaseLot } from '../types/portfolio';
import type { EquityWithLots } from '../store/portfolioStore';
import { lotCost } from './portfolioMath';

export interface DividendTransaction {
  id: string;
  symbol: string;
  name: string;
  date: string;
  shares: number;
  amountPerShare: number;
  totalAmount: number;
}

export interface PurchaseTransaction {
  id: string;
  symbol: string;
  date: string;
  shares: number;
  pricePerShare: number;
  totalCost: number;
}

export interface MonthlyCashFlow {
  month: string; // YYYY-MM
  monthLabel: string; // "Jan 2025"
  cashInvested: number;
  dividendsReceived: number;
  /** dividendsReceived - cashInvested. Buying shares is an outflow. */
  netCashFlow: number;
  cumulativeCashInvested: number;
  cumulativeDividends: number;
  purchaseCount: number;
  dividendCount: number;
  dividendTransactions: DividendTransaction[];
  purchaseTransactions: PurchaseTransaction[];
}

export interface CashFlowTotals {
  totalCashInvested: number;
  totalDividends: number;
  netCashFlow: number;
  totalPurchases: number;
  totalDividendPayments: number;
}

const monthOf = (isoDate: string): { key: string; label: string } => {
  const date = new Date(isoDate + 'T00:00:00');
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return { key, label };
};

const emptyMonth = (key: string, label: string): MonthlyCashFlow => ({
  month: key,
  monthLabel: label,
  cashInvested: 0,
  dividendsReceived: 0,
  netCashFlow: 0,
  cumulativeCashInvested: 0,
  cumulativeDividends: 0,
  purchaseCount: 0,
  dividendCount: 0,
  dividendTransactions: [],
  purchaseTransactions: [],
});

/**
 * Group every purchase lot and every received dividend by calendar month, oldest first, with
 * running totals. Dividends come from the equity views, which already limit them to payments
 * whose ex-date falls after the first lot and size them by the shares owned at that date.
 */
export const buildMonthlyCashFlow = (
  customLots: PurchaseLot[],
  equityViews: EquityWithLots[]
): MonthlyCashFlow[] => {
  const months = new Map<string, MonthlyCashFlow>();
  const monthFor = (isoDate: string): MonthlyCashFlow => {
    const { key, label } = monthOf(isoDate);
    let month = months.get(key);
    if (!month) {
      month = emptyMonth(key, label);
      months.set(key, month);
    }
    return month;
  };

  customLots.forEach(lot => {
    const month = monthFor(lot.tradeDate);
    const totalCost = lotCost(lot);
    month.cashInvested += totalCost;
    month.purchaseCount += 1;
    month.purchaseTransactions.push({
      id: lot.id,
      symbol: lot.symbol,
      date: lot.tradeDate,
      shares: lot.shares,
      pricePerShare: lot.pricePerShare,
      totalCost,
    });
  });

  equityViews.forEach(({ position, dividendsWithShares }) => {
    dividendsWithShares.forEach(dividend => {
      if (dividend.sharesOwned <= 0) return;
      const month = monthFor(dividend.date);
      const totalAmount = dividend.amountPerShare * dividend.sharesOwned;
      month.dividendsReceived += totalAmount;
      month.dividendCount += 1;
      month.dividendTransactions.push({
        id: dividend.id,
        symbol: position.symbol,
        name: position.name,
        date: dividend.date,
        shares: dividend.sharesOwned,
        amountPerShare: dividend.amountPerShare,
        totalAmount,
      });
    });
  });

  const sorted = Array.from(months.values()).sort((a, b) => a.month.localeCompare(b.month));
  let cumulativeCash = 0;
  let cumulativeDividends = 0;
  sorted.forEach(month => {
    cumulativeCash += month.cashInvested;
    cumulativeDividends += month.dividendsReceived;
    month.cumulativeCashInvested = cumulativeCash;
    month.cumulativeDividends = cumulativeDividends;
    month.netCashFlow = month.dividendsReceived - month.cashInvested;
  });
  return sorted;
};

export const summarizeCashFlow = (months: MonthlyCashFlow[]): CashFlowTotals => {
  const totalCashInvested = months.reduce((sum, m) => sum + m.cashInvested, 0);
  const totalDividends = months.reduce((sum, m) => sum + m.dividendsReceived, 0);
  return {
    totalCashInvested,
    totalDividends,
    netCashFlow: totalDividends - totalCashInvested,
    totalPurchases: months.reduce((sum, m) => sum + m.purchaseCount, 0),
    totalDividendPayments: months.reduce((sum, m) => sum + m.dividendCount, 0),
  };
};

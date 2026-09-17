import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../utils/storage', () => ({
  loadCustomLots: () => [],
  persistCustomLots: vi.fn(),
  clearCustomLots: vi.fn(),
  loadSnapshot: () => null,
  persistSnapshot: vi.fn(),
  clearSnapshot: vi.fn(),
  loadSavedPortfolios: () => [],
  saveSavedPortfolios: vi.fn(),
  getActivePortfolioId: () => null,
  setActivePortfolioId: vi.fn(),
  savePortfolio: vi.fn(),
  loadPortfolioById: vi.fn(() => null),
  deletePortfolio: vi.fn(() => true),
  renamePortfolio: vi.fn(() => true),
  getPortfolioMetadataList: vi.fn(() => []),
}));

import { RecentDividendsList } from './RecentDividendsList';
import { usePortfolioStore } from '../../store/portfolioStore';
import { abcAsOf, abcLots, abcSnapshot } from '../../test/fixtures';

const items = () =>
  screen.getAllByRole('listitem').map(li => {
    const [amount, date] = Array.from(li.querySelectorAll('.recent-dividends__details span'));
    return {
      symbol: li.querySelector('.recent-dividends__symbol')?.textContent,
      amount: amount.textContent,
      date: date.textContent,
    };
  });

describe('RecentDividendsList', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(abcAsOf);
    usePortfolioStore.setState({ snapshot: abcSnapshot, customLots: abcLots });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists payouts newest first, sized by the shares owned before each ex-date', () => {
    render(<RecentDividendsList />);
    expect(items()).toEqual([
      { symbol: 'ABC', amount: '$200.00', date: 'Nov 1, 2024' },
      { symbol: 'ABC', amount: '$170.00', date: 'Aug 1, 2024' },
      { symbol: 'ABC', amount: '$100.00', date: 'May 1, 2024' },
      { symbol: 'ABC', amount: '$100.00', date: 'Feb 1, 2024' },
    ]);
  });

  it('sums the trailing twelve months of income in the header', () => {
    render(<RecentDividendsList />);
    expect(screen.getByText('$570.00 in trailing 12-month income')).toBeInTheDocument();
  });

  it('drops payments older than twelve months from the header total but not from the list', () => {
    vi.setSystemTime(new Date('2025-06-01T12:00:00'));
    render(<RecentDividendsList />);
    expect(screen.getByText('$370.00 in trailing 12-month income')).toBeInTheDocument();
    expect(items()).toHaveLength(4);
  });

  it('shows at most eight payouts', () => {
    const dividends = Array.from({ length: 12 }, (_, i) => ({
      id: `d${i}`,
      date: `2024-${String(i + 1).padStart(2, '0')}-20`,
      amountPerShare: 1,
    }));
    usePortfolioStore.setState({
      snapshot: {
        ...abcSnapshot,
        equityMetadata: [{ ...abcSnapshot.equityMetadata[0], dividends }],
      },
    });
    render(<RecentDividendsList />);
    expect(items()).toHaveLength(8);
    expect(items()[0].date).toBe('Dec 20, 2024');
  });

  it('shows nothing for positions with no shares', () => {
    usePortfolioStore.setState({ customLots: [] });
    render(<RecentDividendsList />);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByText('$0.00 in trailing 12-month income')).toBeInTheDocument();
  });
});

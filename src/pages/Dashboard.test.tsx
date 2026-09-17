import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../utils/storage', () => ({
  loadCustomLots: () => [],
  persistCustomLots: () => {},
  clearCustomLots: () => {},
  loadSnapshot: () => null,
  persistSnapshot: () => {},
  clearSnapshot: () => {},
  loadSavedPortfolios: () => [],
  saveSavedPortfolios: () => {},
  getActivePortfolioId: () => null,
  setActivePortfolioId: () => {},
  savePortfolio: vi.fn((id, name, snapshot, lots) => ({
    id,
    name,
    snapshot,
    customLots: lots,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  loadPortfolioById: () => null,
  deletePortfolio: () => true,
  renamePortfolio: () => true,
  getPortfolioMetadataList: () => [],
}));

import { Dashboard } from './Dashboard';
import { usePortfolioStore } from '../store/portfolioStore';
import type { PortfolioSnapshot, PurchaseLot } from '../types/portfolio';

// Noon UTC keeps the calendar day stable for any machine timezone between UTC-11 and UTC+11.
const PRICE_UPDATE = '2025-03-10T12:00:00.000Z';
const DIVIDEND_UPDATE = '2025-03-12T12:00:00.000Z';

const baseSnapshot: PortfolioSnapshot = {
  asOf: '2025-01-15',
  seedAmount: 10000,
  seedDate: '2024-01-01',
  equityMetadata: [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      sector: 'Technology',
      shares: 0,
      averageCost: 150,
      currentPrice: 180,
      dividends: [{ id: 'aapl-2024-q1', date: '2024-02-15', amountPerShare: 0.25 }],
      navHistory: [
        { date: '2024-01-01', value: 170 },
        { date: '2024-06-01', value: 180 },
      ],
    },
  ],
};

const baseLots: PurchaseLot[] = [
  { id: 'lot-aapl-1', symbol: 'AAPL', tradeDate: '2024-01-15', shares: 100, pricePerShare: 150 },
];

const setStore = (
  overrides: Partial<PortfolioSnapshot> = {},
  activePortfolioName: string | null = null
) => {
  usePortfolioStore.setState({
    snapshot: { ...baseSnapshot, ...overrides },
    customLots: baseLots,
    activePortfolioName,
    refreshQuotes: vi.fn(async () => []),
    refreshDividends: vi.fn(async () => []),
  });
};

const tabButton = (label: string) => screen.getByRole('button', { name: label });
const cardTitle = (title: string) => screen.getByRole('heading', { level: 3, name: title });
const queryCardTitle = (title: string) => screen.queryByRole('heading', { level: 3, name: title });

describe('Dashboard', () => {
  beforeEach(() => {
    setStore();
  });

  describe('header', () => {
    test('renders the app title without a portfolio name by default', () => {
      const { container } = render(<Dashboard />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Dividend Portfolio Facts');
      expect(container.querySelector('.portfolio-name')).toBeNull();
    });

    test('appends the active portfolio name to the title', () => {
      setStore({}, 'Retirement');
      const { container } = render(<Dashboard />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Dividend Portfolio Facts - Retirement'
      );
      expect(container.querySelector('.portfolio-name')).toHaveTextContent('- Retirement');
    });

    test('renders the portfolio options menu toggle', () => {
      render(<Dashboard />);
      expect(screen.getByRole('button', { name: 'Portfolio options' })).toBeInTheDocument();
    });
  });

  describe('data status line', () => {
    test('says no data refreshed yet when neither timestamp is set', () => {
      render(<Dashboard />);
      expect(screen.getByText('No data refreshed yet')).toBeInTheDocument();
    });

    test('shows only the price date when only prices were refreshed', () => {
      setStore({ lastPriceUpdate: PRICE_UPDATE });
      render(<Dashboard />);
      const status = screen.getByText(/^Prices:/);
      expect(status).toHaveTextContent('Prices: Mar 10, 2025');
      expect(status.textContent).not.toContain('Dividends');
      expect(status.textContent).not.toContain('•');
    });

    test('shows only the dividend date when only dividends were refreshed', () => {
      setStore({ lastDividendUpdate: DIVIDEND_UPDATE });
      render(<Dashboard />);
      const status = screen.getByText(/^Dividends:/);
      expect(status).toHaveTextContent('Dividends: Mar 12, 2025');
      expect(status.textContent).not.toContain('Prices');
    });

    test('joins both dates with a bullet when both were refreshed', () => {
      setStore({ lastPriceUpdate: PRICE_UPDATE, lastDividendUpdate: DIVIDEND_UPDATE });
      render(<Dashboard />);
      expect(
        screen.getByText('Prices: Mar 10, 2025 • Dividends: Mar 12, 2025')
      ).toBeInTheDocument();
      expect(screen.queryByText('No data refreshed yet')).toBeNull();
    });
  });

  describe('tabs', () => {
    const tabLabels = [
      'Portfolio Overview',
      'Equity Performance',
      'Cash Flow & Investment',
      'Strategy Analysis',
      'Holdings Manager',
    ];

    test('renders all five tab buttons in order', () => {
      const { container } = render(<Dashboard />);
      const labels = Array.from(container.querySelectorAll('.tabs__tab')).map(
        button => button.textContent
      );
      expect(labels).toEqual(tabLabels);
    });

    test('defaults to the overview tab with both overview cards', () => {
      render(<Dashboard />);
      expect(tabButton('Portfolio Overview')).toHaveClass('tabs__tab--active');
      expect(cardTitle('Total Portfolio Health')).toBeInTheDocument();
      expect(cardTitle('Dividend Velocity')).toBeInTheDocument();
      expect(
        screen.getByText('Assets, cost basis, income and growth in one view')
      ).toBeInTheDocument();
      expect(screen.getByText('Recent payouts and momentum')).toBeInTheDocument();
      expect(queryCardTitle('Equity Performance')).toBeNull();
      expect(queryCardTitle('Cash Flow & Investment Report')).toBeNull();
      expect(queryCardTitle('Dividend Strategy Analysis')).toBeNull();
      expect(queryCardTitle('Holdings Manager')).toBeNull();
    });

    test('renders overview child content from the store', () => {
      render(<Dashboard />);
      // OverviewMetrics tiles and the RecentDividendsList header.
      expect(screen.getByText('Market Value')).toBeInTheDocument();
      expect(screen.getByText('Recent Payouts')).toBeInTheDocument();
    });

    const switchCases: Array<{ tab: string; title: string; subtitle: string }> = [
      {
        tab: 'Equity Performance',
        title: 'Equity Performance',
        subtitle:
          'Returns, dividends, NAV erosion, and performance metrics - Click any row to see details',
      },
      {
        tab: 'Cash Flow & Investment',
        title: 'Cash Flow & Investment Report',
        subtitle: 'Track your seed capital, monthly investments, and dividend income',
      },
      {
        tab: 'Strategy Analysis',
        title: 'Dividend Strategy Analysis',
        subtitle:
          'Compare reinvestment vs collection strategies and see the impact on your portfolio',
      },
      {
        tab: 'Holdings Manager',
        title: 'Holdings Manager',
        subtitle: 'Add lots and rebalance blended cost basis',
      },
    ];

    test.each(switchCases)(
      'switching to "$tab" renders the "$title" card and hides the overview',
      ({ tab, title, subtitle }) => {
        render(<Dashboard />);
        fireEvent.click(tabButton(tab));

        expect(tabButton(tab)).toHaveClass('tabs__tab--active');
        expect(tabButton('Portfolio Overview')).not.toHaveClass('tabs__tab--active');
        expect(cardTitle(title)).toBeInTheDocument();
        expect(screen.getByText(subtitle)).toBeInTheDocument();
        expect(queryCardTitle('Total Portfolio Health')).toBeNull();
        expect(queryCardTitle('Dividend Velocity')).toBeNull();
        // Exactly one card is mounted outside the overview.
        expect(document.querySelectorAll('.card__title')).toHaveLength(1);
      }
    );

    test('equity tab renders the combined equity table with the store position', () => {
      render(<Dashboard />);
      fireEvent.click(tabButton('Equity Performance'));
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
      expect(screen.getByText('Portfolio Total')).toBeInTheDocument();
    });

    test('holdings tab renders the holdings manager', () => {
      render(<Dashboard />);
      fireEvent.click(tabButton('Holdings Manager'));
      expect(screen.getByText(/Custom lots tracked/)).toBeInTheDocument();
    });

    test('returning to the overview tab restores the overview cards', () => {
      render(<Dashboard />);
      fireEvent.click(tabButton('Strategy Analysis'));
      expect(cardTitle('Dividend Strategy Analysis')).toBeInTheDocument();

      fireEvent.click(tabButton('Portfolio Overview'));
      expect(tabButton('Portfolio Overview')).toHaveClass('tabs__tab--active');
      expect(cardTitle('Total Portfolio Health')).toBeInTheDocument();
      expect(cardTitle('Dividend Velocity')).toBeInTheDocument();
      expect(queryCardTitle('Dividend Strategy Analysis')).toBeNull();
    });

    test('clicking the active tab keeps it active', () => {
      render(<Dashboard />);
      fireEvent.click(tabButton('Cash Flow & Investment'));
      fireEvent.click(tabButton('Cash Flow & Investment'));
      expect(tabButton('Cash Flow & Investment')).toHaveClass('tabs__tab--active');
      expect(cardTitle('Cash Flow & Investment Report')).toBeInTheDocument();
    });

    test('does not call the network refresh actions on render or tab switches', () => {
      render(<Dashboard />);
      tabLabels.forEach(label => fireEvent.click(tabButton(label)));
      const { refreshQuotes, refreshDividends } = usePortfolioStore.getState();
      expect(refreshQuotes).not.toHaveBeenCalled();
      expect(refreshDividends).not.toHaveBeenCalled();
    });
  });
});

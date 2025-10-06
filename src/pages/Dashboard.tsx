import { useState } from 'react';
import { Tabs } from '../components/common/Tabs';
import type { Tab } from '../components/common/Tabs';
import { Card } from '../components/common/Card';
import { DataMenu } from '../components/common/DataMenu';
import { OverviewMetrics } from '../components/portfolio/OverviewMetrics';
import { RecentDividendsList } from '../components/portfolio/RecentDividendsList';
import { CombinedEquityTable } from '../components/portfolio/CombinedEquityTable';
import { EquityHoldingsManager } from '../components/portfolio/EquityHoldingsManager';
import { CashFlowReport } from '../components/portfolio/CashFlowReport';
import { usePortfolioStore } from '../store/portfolioStore';
import { formatDate } from '../utils/formatters';

const TAB_DEFINITIONS: Tab[] = [
  { id: 'overview', label: 'Portfolio Overview' },
  { id: 'equities', label: 'Equity Performance' },
  { id: 'cashflow', label: 'Cash Flow & Investment' },
  { id: 'holdings', label: 'Holdings Manager' },
];

type TabId = 'overview' | 'equities' | 'cashflow' | 'holdings';

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const snapshot = usePortfolioStore(state => state.snapshot);
  const activePortfolioName = usePortfolioStore(state => state.activePortfolioName);

  const getDataStatusText = () => {
    const parts: string[] = [];

    if (snapshot.lastPriceUpdate) {
      parts.push(`Prices: ${formatDate(snapshot.lastPriceUpdate)}`);
    }

    if (snapshot.lastDividendUpdate) {
      parts.push(`Dividends: ${formatDate(snapshot.lastDividendUpdate)}`);
    }

    return parts.length > 0 ? parts.join(' • ') : 'No data refreshed yet';
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'equities':
        return (
          <Card
            title="Equity Performance"
            subtitle="Returns, dividends, NAV erosion, and performance metrics - Click any row to see details"
          >
            <CombinedEquityTable />
          </Card>
        );
      case 'cashflow':
        return (
          <Card
            title="Cash Flow & Investment Report"
            subtitle="Track your seed capital, monthly investments, and dividend income"
          >
            <CashFlowReport />
          </Card>
        );
      case 'holdings':
        return (
          <Card title="Holdings Manager" subtitle="Add lots and rebalance blended cost basis">
            <EquityHoldingsManager />
          </Card>
        );
      case 'overview':
      default:
        return (
          <div className="content-grid">
            <Card
              title="Total Portfolio Health"
              subtitle="Assets, cost basis, income and growth in one view"
            >
              <OverviewMetrics />
            </Card>
            <Card title="Dividend Velocity" subtitle="Recent payouts and momentum">
              <RecentDividendsList />
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div>
          <h1>
            Dividend Portfolio Command Center
            {activePortfolioName && (
              <span className="portfolio-name"> - {activePortfolioName}</span>
            )}
          </h1>
          <p>{getDataStatusText()}</p>
        </div>
        <DataMenu />
      </header>
      <Tabs
        tabs={TAB_DEFINITIONS}
        activeTab={activeTab}
        onChange={tabId => setActiveTab(tabId as TabId)}
      />
      <main className="app-shell__content">{renderTabContent()}</main>
    </div>
  );
};

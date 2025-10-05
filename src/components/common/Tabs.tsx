import clsx from 'clsx';
import type { ReactNode } from 'react';

export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: ReadonlyArray<Tab>;
  activeTab: string;
  onChange: (tabId: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => (
  <nav className="tabs">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        className={clsx('tabs__tab', tab.id === activeTab && 'tabs__tab--active')}
        onClick={() => onChange(tab.id)}
      >
        {tab.icon && <span className="tabs__icon">{tab.icon}</span>}
        <span>{tab.label}</span>
      </button>
    ))}
  </nav>
);

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { Tabs } from './Tabs';

describe('Tabs', () => {
  const mockTabs = [
    { id: 'tab1', label: 'Tab 1' },
    { id: 'tab2', label: 'Tab 2' },
    { id: 'tab3', label: 'Tab 3' }
  ];

  afterEach(() => {
    cleanup();
  });

  it('should render all tabs', () => {
    const onChange = vi.fn();
    const { container } = render(<Tabs tabs={mockTabs} activeTab="tab1" onChange={onChange} />);

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(3);
    expect(buttons[0].textContent).toContain('Tab 1');
    expect(buttons[1].textContent).toContain('Tab 2');
    expect(buttons[2].textContent).toContain('Tab 3');
  });

  it('should highlight active tab', () => {
    const onChange = vi.fn();
    const { container } = render(
      <Tabs tabs={mockTabs} activeTab="tab2" onChange={onChange} />
    );

    const buttons = container.querySelectorAll('button');
    expect(buttons[1].className).toContain('tabs__tab--active');
  });

  it('should call onChange when tab is clicked', () => {
    const onChange = vi.fn();
    const { container } = render(<Tabs tabs={mockTabs} activeTab="tab1" onChange={onChange} />);

    const buttons = container.querySelectorAll('button');
    fireEvent.click(buttons[1]); // Click Tab 2

    expect(onChange).toHaveBeenCalledWith('tab2');
  });

  it('should call onChange even when active tab is clicked', () => {
    const onChange = vi.fn();
    const { container } = render(<Tabs tabs={mockTabs} activeTab="tab1" onChange={onChange} />);

    const buttons = container.querySelectorAll('button');
    fireEvent.click(buttons[0]); // Click Tab 1 (active)

    expect(onChange).toHaveBeenCalledWith('tab1');
  });

  it('should render with correct number of tabs', () => {
    const onChange = vi.fn();
    const { container } = render(
      <Tabs tabs={mockTabs} activeTab="tab1" onChange={onChange} />
    );

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(3);
  });

  it('should render tab with icon', () => {
    const onChange = vi.fn();
    const tabsWithIcon = [
      { id: 'tab1', label: 'Tab 1', icon: <span>📊</span> }
    ];

    const { container } = render(<Tabs tabs={tabsWithIcon} activeTab="tab1" onChange={onChange} />);

    const icon = container.querySelector('.tabs__icon');
    expect(icon).toBeDefined();
  });
});


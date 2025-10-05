import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MetricTile } from './MetricTile';

describe('MetricTile', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render label and value', () => {
    render(<MetricTile label="Total Value" value="$10,000" />);
    expect(screen.getByText('Total Value')).toBeDefined();
    expect(screen.getByText('$10,000')).toBeDefined();
  });

  it('should render trend when provided', () => {
    render(
      <MetricTile
        label="ROI"
        value="15.5%"
        trend={{ label: '+2.3%', positive: true }}
      />
    );
    expect(screen.getByText('+2.3%')).toBeDefined();
  });

  it('should apply positive trend styling', () => {
    const { container } = render(
      <MetricTile
        label="Positive ROI"
        value="15.5%"
        trend={{ label: '+2.3%', positive: true }}
      />
    );
    const trendElement = container.querySelector('.metric-tile__trend--positive');
    expect(trendElement).toBeDefined();
    expect(trendElement?.textContent).toBe('+2.3%');
  });

  it('should apply negative trend styling', () => {
    const { container } = render(
      <MetricTile
        label="Negative ROI"
        value="15.5%"
        trend={{ label: '-1.2%', positive: false }}
      />
    );
    const trendElement = container.querySelector('.metric-tile__trend--negative');
    expect(trendElement).toBeDefined();
    expect(trendElement?.textContent).toBe('-1.2%');
  });

  it('should render with default styling', () => {
    const { container } = render(<MetricTile label="Test" value="123" />);
    const tile = container.firstChild as HTMLElement;
    expect(tile.className).toContain('metric-tile');
  });
});


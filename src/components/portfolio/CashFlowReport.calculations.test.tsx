import { describe, it, expect, beforeEach, vi } from 'vitest';
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

import { CashFlowReport } from './CashFlowReport';
import { usePortfolioStore } from '../../store/portfolioStore';
import { abcLots, abcSnapshot } from '../../test/fixtures';

const tile = (label: string) => {
  const el = screen.getByText(label, { selector: '.metric-tile__label' }).parentElement!;
  return {
    value: el.querySelector('.metric-tile__value')?.textContent?.trim(),
    trend: el.querySelector('.metric-tile__trend')?.textContent?.trim(),
  };
};

const tableMatrix = (container: HTMLElement, section: 'tbody' | 'tfoot') =>
  Array.from(container.querySelectorAll(`.cash-flow-report table ${section} tr`)).map(tr =>
    Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.replace(/[▶▼]/g, '').trim())
  );

describe('CashFlowReport calculations', () => {
  describe('with the ABC fixture', () => {
    beforeEach(() => {
      usePortfolioStore.setState({ snapshot: abcSnapshot, customLots: abcLots });
    });

    it('shows the seed, what was invested, and what came back', () => {
      render(<CashFlowReport />);
      expect(tile('Initial Seed')).toEqual({ value: '$10,000.00', trend: 'Jan 1, 2024' });
      expect(tile('Total Cash Invested')).toEqual({ value: '$2,000.00', trend: '4 purchases' });
      expect(tile('Total Dividends Received')).toEqual({ value: '$570.00', trend: '4 payments' });
      expect(tile('Net Cash Flow')).toEqual({ value: '-$1,430.00', trend: 'Dividends - Invested' });
    });

    it('derives cash and returns from contributed capital, counting the external deposit', () => {
      render(<CashFlowReport />);
      expect(tile('Current Cash Balance')).toEqual({
        value: '$8,870.00',
        trend: 'Seed + external deposits - invested + dividends',
      });
      expect(tile('Dividend ROI')).toEqual({
        value: '+5.5%',
        trend: 'Dividends / contributed capital',
      });
      expect(tile('True ROI')).toEqual({
        value: '+9.4%',
        trend: '(Market value + cash - contributed) / contributed',
      });
    });

    it('lists every month with running totals', () => {
      const { container } = render(<CashFlowReport />);
      expect(tableMatrix(container, 'tbody')).toEqual([
        ['Jan 2024', '$1,000.00', '$0.00', '-$1,000.00', '$1,000.00', '$0.00', '1', '0'],
        ['Feb 2024', '$0.00', '$100.00', '$100.00', '$1,000.00', '$100.00', '0', '1'],
        ['May 2024', '$500.00', '$100.00', '-$400.00', '$1,500.00', '$200.00', '1', '1'],
        ['Jul 2024', '$200.00', '$0.00', '-$200.00', '$1,700.00', '$200.00', '1', '0'],
        ['Aug 2024', '$0.00', '$170.00', '$170.00', '$1,700.00', '$370.00', '0', '1'],
        ['Oct 2024', '$300.00', '$0.00', '-$300.00', '$2,000.00', '$370.00', '1', '0'],
        ['Nov 2024', '$0.00', '$200.00', '$200.00', '$2,000.00', '$570.00', '0', '1'],
      ]);
    });

    it('totals the table', () => {
      const { container } = render(<CashFlowReport />);
      expect(tableMatrix(container, 'tfoot')).toEqual([
        ['Total', '$2,000.00', '$570.00', '-$1,430.00', '—', '—', '4', '4'],
      ]);
    });

    it('sizes a dividend by the shares owned before its ex-date, not by the current position', () => {
      // 200 shares are held today, but only 100 were held before the February ex-date.
      const { container } = render(<CashFlowReport />);
      const feb = tableMatrix(container, 'tbody')[1];
      expect(feb[2]).toBe('$100.00');
    });
  });

  describe('without any contributed capital', () => {
    beforeEach(() => {
      usePortfolioStore.setState({
        snapshot: { ...abcSnapshot, seedAmount: undefined, seedDate: undefined },
        customLots: abcLots.map(lot => ({ ...lot, fundingSource: undefined })),
      });
    });

    it('refuses to compute return figures and says why', () => {
      render(<CashFlowReport />);
      expect(tile('Initial Seed')).toEqual({ value: '$0.00', trend: 'Date not set' });
      expect(tile('Current Cash Balance').value).toBe('—');
      expect(tile('Dividend ROI').value).toBe('—');
      expect(tile('True ROI').value).toBe('—');
      expect(screen.getAllByText('Set initial seed to calculate')).toHaveLength(3);
    });

    it('still reports the flows themselves', () => {
      render(<CashFlowReport />);
      expect(tile('Total Cash Invested').value).toBe('$2,000.00');
      expect(tile('Total Dividends Received').value).toBe('$570.00');
    });
  });

  it('counts an external deposit as capital even with no seed', () => {
    usePortfolioStore.setState({
      snapshot: { ...abcSnapshot, seedAmount: undefined },
      customLots: abcLots,
    });
    render(<CashFlowReport />);
    // Contributed 300, invested 2,000, received 570: cash is -1,130 and the account is worth 1,270.
    expect(tile('Current Cash Balance').value).toBe('-$1,130.00');
    expect(tile('True ROI').value).toBe('+323.3%');
  });
});

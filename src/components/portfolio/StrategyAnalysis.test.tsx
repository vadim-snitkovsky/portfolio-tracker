import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { PortfolioSnapshot } from '../../types/portfolio';

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

vi.mock('../../utils/portfolioImport', () => ({ readSnapshotFile: vi.fn() }));

import { StrategyAnalysis } from './StrategyAnalysis';
import { usePortfolioStore } from '../../store/portfolioStore';
import { readSnapshotFile } from '../../utils/portfolioImport';
import { abcAsOf, abcLots, abcSnapshot } from '../../test/fixtures';

/** The three value cells (current, what-if, difference) of the comparison row with this label. */
const cells = (label: string): string[] => {
  const row = screen.getByText(label).closest('tr');
  if (!row) throw new Error(`no row for ${label}`);
  return Array.from(row.querySelectorAll('td'))
    .slice(1)
    .map(td => td.textContent?.trim() ?? '');
};

describe('StrategyAnalysis', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(abcAsOf);
    usePortfolioStore.setState({ snapshot: abcSnapshot, customLots: abcLots });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('asks for a seed before comparing anything', () => {
    usePortfolioStore.setState({ snapshot: { ...abcSnapshot, seedAmount: 0 } });
    render(<StrategyAnalysis />);
    expect(
      screen.getByText('Set your initial seed amount to see dividend strategy comparison.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Dividend Reinvestment Impact')).not.toBeInTheDocument();
  });

  it('shows the reinvestment benefit as the gap in total account value', () => {
    const { container } = render(<StrategyAnalysis />);
    const highlight = container.querySelector('.impact-value')!;
    expect(highlight.querySelector('.value')?.textContent).toBe('+$80.00');
    expect(highlight.querySelector('.value')?.className).toContain('positive');
    expect(highlight.querySelector('.percentage')?.textContent).toBe('(+0.8%)');
  });

  it('lays out the starting position and dividend activity', () => {
    render(<StrategyAnalysis />);
    expect(cells('Initial Investment')).toEqual(['$10,000.00', '$10,000.00', '$0.00']);
    expect(cells('Total Contributed (seed + external deposits)')).toEqual([
      '$10,300.00',
      '$10,300.00',
      '$0.00',
    ]);
    expect(cells('Total Dividends Received')).toEqual(['$570.00', '$570.00', '$0.00']);
    expect(cells('Dividends Reinvested')).toEqual(['$200.00', '$0.00', '+$200.00']);
    expect(cells('Dividends from Reinvested Holdings')).toEqual(['$40.00', '$0.00', '+$40.00']);
    expect(cells('Dividends Kept as Cash')).toEqual(['$370.00', '$530.00', '-$160.00']);
  });

  it('values both strategies with the same account arithmetic', () => {
    render(<StrategyAnalysis />);
    expect(cells('Portfolio Market Value')).toEqual(['$2,400.00', '$2,160.00', '+$240.00']);
    expect(cells('Cash Balance')).toEqual(['$8,870.00', '$9,030.00', '-$160.00']);
    expect(cells('Total Account Value')).toEqual(['$11,270.00', '$11,190.00', '+$80.00']);
  });

  it('reports return on contributed capital and trailing twelve month income', () => {
    render(<StrategyAnalysis />);
    expect(cells('True ROI')).toEqual(['9.4%', '8.6%', '+0.8%']);
    expect(cells('Trailing 12-Month Dividends')).toEqual(['$570.00', '$530.00', '+$40.00']);
    expect(cells('Trailing 12-Month Dividend Yield')).toEqual(['23.8%', '24.5%', '-0.8%']);
  });

  it('colors the difference cells by sign', () => {
    render(<StrategyAnalysis />);
    const diffCell = (label: string) =>
      screen.getByText(label).closest('tr')!.querySelectorAll('td')[3];
    expect(diffCell('Total Account Value').className).toBe('positive');
    expect(diffCell('Cash Balance').className).toBe('negative');
    expect(diffCell('Trailing 12-Month Dividend Yield').className).toBe('negative');
    expect(diffCell('Initial Investment').className).toBe('neutral');
  });

  it('shows how each lot was classified, in trade-date order', () => {
    render(<StrategyAnalysis />);
    const table = screen.getByText('Seed Spent Before').closest('table')!;
    const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr =>
      Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim())
    );
    expect(rows).toEqual([
      ['2024-01-15', 'ABC', '$1,000.00', '$0.00', '$1,000.00', 'inferred-seed'],
      ['2024-05-01', 'ABC', '$500.00', '$1,000.00', '$1,500.00', 'inferred-seed'],
      ['2024-07-01', 'ABC', '$200.00', '$1,500.00', '$1,500.00', 'explicit-dividend'],
      ['2024-10-01', 'ABC', '$300.00', '$1,500.00', '$1,500.00', 'explicit-external'],
    ]);
  });

  it('flips the benefit negative when reinvested shares lost value', () => {
    // Reinvested shares bought at $10 now worth $1: 20 x 1 - 200 + 40 = -140.
    usePortfolioStore.setState({
      snapshot: {
        ...abcSnapshot,
        equityMetadata: [{ ...abcSnapshot.equityMetadata[0], currentPrice: 1 }],
      },
    });
    const { container } = render(<StrategyAnalysis />);
    const value = container.querySelector('.impact-value .value')!;
    expect(value.textContent).toBe('-$140.00');
    expect(value.className).toContain('negative');
    expect(cells('Total Account Value')[2]).toBe('-$140.00');
  });

  describe('portfolio JSON loader', () => {
    const chooseFile = () => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['{}'], 'portfolio.json', { type: 'application/json' });
      fireEvent.change(input, { target: { files: [file] } });
    };

    it('replaces the snapshot and lots with the loaded file', async () => {
      const loaded: PortfolioSnapshot = { ...abcSnapshot, asOf: '2025-06-30' };
      vi.mocked(readSnapshotFile).mockResolvedValue({ snapshot: loaded, customLots: [] });
      render(<StrategyAnalysis />);
      chooseFile();
      await waitFor(() => expect(usePortfolioStore.getState().snapshot.asOf).toBe('2025-06-30'));
      expect(usePortfolioStore.getState().customLots).toEqual([]);
    });

    it('alerts when the file cannot be read', async () => {
      vi.mocked(readSnapshotFile).mockRejectedValue(new Error('bad json'));
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
      render(<StrategyAnalysis />);
      chooseFile();
      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('Failed to load portfolio JSON: bad json')
      );
      expect(usePortfolioStore.getState().snapshot.asOf).toBe('2024-12-31');
    });

    it('ignores an empty selection', () => {
      render(<StrategyAnalysis />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [] } });
      expect(readSnapshotFile).not.toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, within, cleanup } from '@testing-library/react';
import { CashFlowReport } from './CashFlowReport';
import { usePortfolioStore } from '../../store/portfolioStore';
import type { PortfolioSnapshot, PurchaseLot } from '../../types/portfolio';

describe('CashFlowReport', () => {
  describe('interactions', () => {
    // The component reads straight from the Zustand store, so each test seeds the store and
    // the afterEach puts the original state (sample data plus the real actions) back.
    const initialState = usePortfolioStore.getState();

    const snapshot: PortfolioSnapshot = {
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
          dividends: [
            { id: 'div-feb', date: '2024-02-15', amountPerShare: 0.25 },
            { id: 'div-may', date: '2024-05-15', amountPerShare: 0.25 },
          ],
          navHistory: [],
        },
      ],
    };

    // Jan 2024 has a purchase only, Feb 2024 a purchase and a dividend, May 2024 a dividend only.
    const customLots: PurchaseLot[] = [
      { id: 'lot-jan', symbol: 'AAPL', tradeDate: '2024-01-15', shares: 100, pricePerShare: 150 },
      { id: 'lot-feb', symbol: 'AAPL', tradeDate: '2024-02-01', shares: 10, pricePerShare: 160 },
    ];

    const monthRow = (label: string) =>
      screen.getByText(label).closest('tr') as HTMLTableRowElement;
    const editButton = () => screen.getByTitle('Edit seed amount and date');
    const amountInput = () => screen.getByPlaceholderText('Amount') as HTMLInputElement;
    const dateInput = () => document.querySelector('input[type="date"]') as HTMLInputElement;

    beforeEach(() => {
      usePortfolioStore.setState({ snapshot, customLots });
    });

    afterEach(() => {
      // Unmount before touching the store so the reset does not re-render outside act().
      cleanup();
      usePortfolioStore.setState(initialState, true);
      vi.restoreAllMocks();
    });

    describe('month rows', () => {
      it('expands a month to show its transactions and collapses it on a second click', () => {
        render(<CashFlowReport />);
        expect(screen.queryByText('Transactions')).toBeNull();

        const row = monthRow('Feb 2024');
        expect(within(row).getByText('▶')).toBeInTheDocument();

        fireEvent.click(row);

        expect(row.className).toBe('expanded-row');
        expect(within(row).getByText('▼')).toBeInTheDocument();
        const details = screen.getByText('Transactions').closest('tr') as HTMLTableRowElement;
        expect(within(details).getByText('Apple Inc.')).toBeInTheDocument();
        // One dividend row and one purchase row, both tagged with the symbol.
        expect(within(details).getAllByText('AAPL')).toHaveLength(2);
        expect(within(details).getByRole('button', { name: 'Delete' })).toBeInTheDocument();

        fireEvent.click(row);

        expect(row.className).toBe('');
        expect(within(row).getByText('▶')).toBeInTheDocument();
        expect(screen.queryByText('Transactions')).toBeNull();
      });

      it('moves the expansion to the month clicked last', () => {
        render(<CashFlowReport />);

        fireEvent.click(monthRow('Jan 2024'));
        expect(monthRow('Jan 2024').className).toBe('expanded-row');

        fireEvent.click(monthRow('May 2024'));

        expect(monthRow('Jan 2024').className).toBe('');
        expect(monthRow('May 2024').className).toBe('expanded-row');
        expect(screen.getAllByText('Transactions')).toHaveLength(1);
      });

      it('renders an empty table when there are no lots or dividends', () => {
        usePortfolioStore.setState({
          snapshot: { ...snapshot, equityMetadata: [] },
          customLots: [],
        });

        const { container } = render(<CashFlowReport />);

        expect(screen.getByText('Monthly Cash Flow')).toBeInTheDocument();
        expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
        expect(screen.getByText('Total')).toBeInTheDocument();
        expect(screen.queryByText('Transactions')).toBeNull();
      });
    });

    describe('deleting a dividend', () => {
      it('removes the dividend through the store when the confirmation is accepted', () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        const removeDividend = vi.fn(initialState.removeDividend);
        usePortfolioStore.setState({ removeDividend });
        render(<CashFlowReport />);
        fireEvent.click(monthRow('May 2024'));

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(confirmSpy.mock.calls[0][0]).toContain('Apple Inc.');
        expect(removeDividend).toHaveBeenCalledWith('AAPL', 'div-may');
        const remaining = usePortfolioStore.getState().snapshot.equityMetadata[0].dividends;
        expect(remaining.map(dividend => dividend.id)).toEqual(['div-feb']);
        // May only had that one payment, so the month disappears with it.
        expect(screen.queryByText('May 2024')).toBeNull();
      });

      it('keeps the dividend when the confirmation is declined', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        const removeDividend = vi.fn(initialState.removeDividend);
        usePortfolioStore.setState({ removeDividend });
        render(<CashFlowReport />);
        fireEvent.click(monthRow('May 2024'));

        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        expect(removeDividend).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
        expect(usePortfolioStore.getState().snapshot.equityMetadata[0].dividends).toHaveLength(2);
      });
    });

    describe('Initial Seed tile', () => {
      it('shows the stored date and an edit button when not editing', () => {
        render(<CashFlowReport />);

        expect(screen.getByText('Initial Seed')).toBeInTheDocument();
        expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
        expect(editButton()).toBeInTheDocument();
        expect(screen.queryByPlaceholderText('Amount')).toBeNull();
      });

      it('opens the editor prefilled with the current amount and date', () => {
        render(<CashFlowReport />);

        fireEvent.click(editButton());

        expect(amountInput().value).toBe('10000');
        expect(dateInput().value).toBe('2024-01-01');
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(screen.queryByTitle('Edit seed amount and date')).toBeNull();
      });

      it('saves the new amount and date through the store', () => {
        const setSnapshot = vi.fn(initialState.setSnapshot);
        usePortfolioStore.setState({ setSnapshot });
        render(<CashFlowReport />);
        fireEvent.click(editButton());

        fireEvent.change(amountInput(), { target: { value: '25000' } });
        fireEvent.change(dateInput(), { target: { value: '2024-03-01' } });
        expect(amountInput().value).toBe('25000');
        expect(dateInput().value).toBe('2024-03-01');

        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(setSnapshot).toHaveBeenCalledTimes(1);
        expect(setSnapshot).toHaveBeenCalledWith(
          expect.objectContaining({ seedAmount: 25000, seedDate: '2024-03-01' })
        );
        const stored = usePortfolioStore.getState().snapshot;
        expect(stored.seedAmount).toBe(25000);
        expect(stored.seedDate).toBe('2024-03-01');
        expect(screen.getByText('Mar 1, 2024')).toBeInTheDocument();
        expect(editButton()).toBeInTheDocument();
        expect(screen.queryByPlaceholderText('Amount')).toBeNull();
      });

      it('stores no seed date when the date is cleared', () => {
        const setSnapshot = vi.fn(initialState.setSnapshot);
        usePortfolioStore.setState({ setSnapshot });
        render(<CashFlowReport />);
        fireEvent.click(editButton());

        fireEvent.change(dateInput(), { target: { value: '' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(setSnapshot).toHaveBeenCalledWith(
          expect.objectContaining({ seedAmount: 10000, seedDate: undefined })
        );
        expect(usePortfolioStore.getState().snapshot.seedDate).toBeUndefined();
        expect(screen.getByText('Date not set')).toBeInTheDocument();
        expect(screen.queryByText('Jan 1, 2024')).toBeNull();
      });

      it('stores a zero seed when the amount is left blank', () => {
        const setSnapshot = vi.fn(initialState.setSnapshot);
        usePortfolioStore.setState({ setSnapshot });
        render(<CashFlowReport />);
        fireEvent.click(editButton());

        fireEvent.change(amountInput(), { target: { value: '' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(setSnapshot).toHaveBeenCalledWith(expect.objectContaining({ seedAmount: 0 }));
        expect(usePortfolioStore.getState().snapshot.seedAmount).toBe(0);
        // Cash Balance, Dividend ROI and True ROI all fall back to the placeholder.
        expect(screen.getAllByText('Set initial seed to calculate')).toHaveLength(3);
      });

      it('discards the edits when Cancel is clicked', () => {
        const setSnapshot = vi.fn(initialState.setSnapshot);
        usePortfolioStore.setState({ setSnapshot });
        render(<CashFlowReport />);
        fireEvent.click(editButton());
        fireEvent.change(amountInput(), { target: { value: '99999' } });
        fireEvent.change(dateInput(), { target: { value: '2030-12-31' } });

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(setSnapshot).not.toHaveBeenCalled();
        expect(usePortfolioStore.getState().snapshot.seedAmount).toBe(10000);
        expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
        expect(screen.queryByPlaceholderText('Amount')).toBeNull();

        // Reopening starts from the stored values, not the abandoned draft.
        fireEvent.click(editButton());
        expect(amountInput().value).toBe('10000');
        expect(dateInput().value).toBe('2024-01-01');
      });

      it('highlights Save and Cancel while hovered and restores them on leave', () => {
        render(<CashFlowReport />);
        fireEvent.click(editButton());

        for (const name of ['Save', 'Cancel']) {
          const button = screen.getByRole('button', { name });
          const idle = button.style.background;

          fireEvent.mouseEnter(button);
          expect(button.style.background).not.toBe(idle);

          fireEvent.mouseLeave(button);
          expect(button.style.background).toBe(idle);
        }
      });

      it('shows placeholders and "Date not set" when no seed is recorded', () => {
        usePortfolioStore.setState({
          snapshot: { ...snapshot, seedAmount: undefined, seedDate: undefined },
        });

        render(<CashFlowReport />);

        expect(screen.getAllByText('Set initial seed to calculate')).toHaveLength(3);
        expect(screen.getByText('Date not set')).toBeInTheDocument();
        expect(editButton()).toBeInTheDocument();

        fireEvent.click(editButton());
        expect(amountInput().value).toBe('0');
        expect(dateInput().value).toBe('');
      });

      it('drops the placeholders when an externally funded lot exists without a seed', () => {
        usePortfolioStore.setState({
          snapshot: { ...snapshot, seedAmount: 0 },
          customLots: [{ ...customLots[0], fundingSource: 'external' }],
        });

        render(<CashFlowReport />);

        expect(screen.queryByText('Set initial seed to calculate')).toBeNull();
        expect(screen.getByText('Current Cash Balance')).toBeInTheDocument();
        expect(screen.getByText('Dividend ROI')).toBeInTheDocument();
        expect(screen.getByText('True ROI')).toBeInTheDocument();
      });
    });
  });
});

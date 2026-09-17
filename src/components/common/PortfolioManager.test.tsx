import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { PortfolioMetadata, PortfolioSnapshot, SavedPortfolio } from '../../types/portfolio';

vi.mock('../../utils/storage', () => ({
  loadCustomLots: vi.fn(() => []),
  persistCustomLots: vi.fn(),
  clearCustomLots: vi.fn(),
  loadSnapshot: vi.fn(() => null),
  persistSnapshot: vi.fn(),
  clearSnapshot: vi.fn(),
  loadSavedPortfolios: vi.fn(() => []),
  saveSavedPortfolios: vi.fn(),
  getActivePortfolioId: vi.fn(() => null),
  setActivePortfolioId: vi.fn(),
  savePortfolio: vi.fn(),
  loadPortfolioById: vi.fn(() => null),
  deletePortfolio: vi.fn(() => true),
  renamePortfolio: vi.fn(() => true),
  getPortfolioMetadataList: vi.fn(() => []),
}));

import * as storage from '../../utils/storage';
import { PortfolioManager } from './PortfolioManager';
import { usePortfolioStore } from '../../store/portfolioStore';

const activeSnapshot: PortfolioSnapshot = {
  asOf: '2025-01-15',
  seedAmount: 10000,
  equityMetadata: [],
};

// Local date-times (no Z suffix) so formatDate renders the same day in every timezone.
const growth: PortfolioMetadata = {
  id: 'portfolio-growth',
  name: 'Growth',
  createdAt: '2025-01-10T09:00:00',
  updatedAt: '2025-02-01T09:00:00',
};

const income: PortfolioMetadata = {
  id: 'portfolio-income',
  name: 'Income',
  createdAt: '2025-01-20T09:00:00',
  updatedAt: '2025-01-25T09:00:00',
};

const savedIncome: SavedPortfolio = {
  ...income,
  snapshot: { asOf: '2024-11-30', seedAmount: 2500, equityMetadata: [] },
  customLots: [
    { id: 'lot-o', symbol: 'O', tradeDate: '2024-12-01', shares: 40, pricePerShare: 55 },
  ],
};

const PLACEHOLDER = 'Enter portfolio name';
const EMPTY_NAME_ERROR = 'Please enter a portfolio name';
const NEW_ID = expect.stringMatching(/^portfolio-\d+$/);

const renderManager = (isOpen = true) => {
  const onClose = vi.fn();
  const view = render(<PortfolioManager isOpen={isOpen} onClose={onClose} />);
  return { ...view, onClose };
};

const currentPortfolio = () => document.querySelector('.current-portfolio__info') as HTMLElement;
const message = () => document.querySelector('.portfolio-manager__message');
const nameInput = () => screen.getByPlaceholderText(PLACEHOLDER) as HTMLInputElement;
const form = () => document.querySelector('.portfolio-form') as HTMLElement;
// Rows are addressed by position because the mocked list is always [growth, income]. Matching on
// the name text would collide with the "Current Portfolio" heading and break in rename mode,
// where the row's <strong> is replaced by an input.
const savedOrder = [growth, income];
const listItem = (portfolio: PortfolioMetadata) =>
  document.querySelectorAll('.portfolio-item')[savedOrder.indexOf(portfolio)] as HTMLElement;
const itemButton = (portfolio: PortfolioMetadata, label: string) =>
  within(listItem(portfolio)).getByRole('button', { name: label });
const renameInput = (portfolio: PortfolioMetadata) =>
  within(listItem(portfolio)).getByRole('textbox');

const setActive = (portfolio: PortfolioMetadata | null) => {
  usePortfolioStore.setState({
    activePortfolioId: portfolio?.id ?? null,
    activePortfolioName: portfolio?.name ?? null,
  });
};

describe('PortfolioManager', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(storage.getPortfolioMetadataList).mockReturnValue([growth, income]);
    vi.mocked(storage.loadPortfolioById).mockImplementation(id =>
      id === income.id ? savedIncome : null
    );
    vi.mocked(storage.deletePortfolio).mockReturnValue(true);
    vi.mocked(storage.renamePortfolio).mockReturnValue(true);
    usePortfolioStore.setState({
      snapshot: activeSnapshot,
      customLots: [],
      activePortfolioId: growth.id,
      activePortfolioName: growth.name,
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('visibility', () => {
    test('renders nothing while closed', () => {
      const { container } = renderManager(false);
      expect(container).toBeEmptyDOMElement();
    });

    test('closes from the close button and the overlay, but not from clicks inside', () => {
      const { container, onClose } = renderManager();

      fireEvent.click(screen.getByRole('heading', { name: 'Portfolio Manager' }));
      expect(onClose).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: '×' }));
      expect(onClose).toHaveBeenCalledTimes(1);

      fireEvent.click(container.querySelector('.portfolio-manager-overlay') as HTMLElement);
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('current portfolio', () => {
    test('shows the active portfolio name and id', () => {
      renderManager();
      expect(currentPortfolio()).toHaveTextContent('Growth');
      expect(currentPortfolio()).toHaveTextContent('ID: portfolio-growth');
      expect(message()).toBeNull();
    });

    test('shows a placeholder and no id when nothing is active', () => {
      setActive(null);
      renderManager();
      expect(currentPortfolio()).toHaveTextContent('Unsaved Portfolio');
      expect(currentPortfolio().querySelector('.portfolio-id')).toBeNull();
    });

    test('Save writes the active portfolio under its current name', () => {
      renderManager();

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(storage.savePortfolio).toHaveBeenCalledWith(growth.id, 'Growth', activeSnapshot, []);
      expect(storage.setActivePortfolioId).toHaveBeenCalledWith(growth.id);
      expect(screen.getByText('Saved portfolio: Growth')).toHaveClass(
        'portfolio-manager__message--success'
      );
    });

    test('Save names an unsaved portfolio "My Portfolio" and makes it active', () => {
      setActive(null);
      renderManager();

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(storage.savePortfolio).toHaveBeenCalledWith(
        NEW_ID,
        'My Portfolio',
        activeSnapshot,
        []
      );
      expect(screen.getByText('Saved portfolio: My Portfolio')).toBeInTheDocument();
      expect(currentPortfolio()).toHaveTextContent('My Portfolio');
      expect(currentPortfolio()).toHaveTextContent(/ID: portfolio-\d+/);
      expect(usePortfolioStore.getState().activePortfolioName).toBe('My Portfolio');
    });
  });

  describe('save as', () => {
    test('toggles the form from the Save As button and closes it from Cancel', () => {
      renderManager();
      expect(screen.queryByPlaceholderText(PLACEHOLDER)).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Save As...' }));
      expect(nameInput()).toHaveValue('');

      fireEvent.click(screen.getByRole('button', { name: 'Save As...' }));
      expect(screen.queryByPlaceholderText(PLACEHOLDER)).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Save As...' }));
      fireEvent.click(within(form()).getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByPlaceholderText(PLACEHOLDER)).toBeNull();
    });

    test('rejects a blank name and keeps the form open', () => {
      renderManager();
      fireEvent.click(screen.getByRole('button', { name: 'Save As...' }));

      fireEvent.change(nameInput(), { target: { value: '   ' } });
      fireEvent.click(within(form()).getByRole('button', { name: 'Save' }));

      expect(screen.getByText(EMPTY_NAME_ERROR)).toHaveClass('portfolio-manager__message--error');
      expect(storage.savePortfolio).not.toHaveBeenCalled();
      expect(nameInput()).toHaveValue('   ');
    });

    test('saves under the trimmed name from the Save button and closes the form', () => {
      setActive(null);
      renderManager();
      fireEvent.click(screen.getByRole('button', { name: 'Save As...' }));

      fireEvent.change(nameInput(), { target: { value: '  Retirement  ' } });
      fireEvent.click(within(form()).getByRole('button', { name: 'Save' }));

      expect(storage.savePortfolio).toHaveBeenCalledWith(NEW_ID, 'Retirement', activeSnapshot, []);
      expect(screen.getByText('Saved portfolio as: Retirement')).toHaveClass(
        'portfolio-manager__message--success'
      );
      expect(screen.queryByPlaceholderText(PLACEHOLDER)).toBeNull();
      expect(currentPortfolio()).toHaveTextContent('Retirement');
    });

    test('submits on Enter and ignores other keys', () => {
      setActive(null);
      renderManager();
      fireEvent.click(screen.getByRole('button', { name: 'Save As...' }));
      fireEvent.change(nameInput(), { target: { value: 'Dividend' } });

      fireEvent.keyDown(nameInput(), { key: 'a' });
      expect(storage.savePortfolio).not.toHaveBeenCalled();

      fireEvent.keyDown(nameInput(), { key: 'Enter' });
      expect(storage.savePortfolio).toHaveBeenCalledWith(NEW_ID, 'Dividend', activeSnapshot, []);
      expect(screen.getByText('Saved portfolio as: Dividend')).toBeInTheDocument();
    });
  });

  describe('new portfolio', () => {
    test('toggles the form from the New Portfolio button and closes it from Cancel', () => {
      renderManager();

      fireEvent.click(screen.getByRole('button', { name: '+ New Portfolio' }));
      expect(nameInput()).toHaveValue('');
      expect(within(form()).getByRole('button', { name: 'Create' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: '+ New Portfolio' }));
      expect(screen.queryByPlaceholderText(PLACEHOLDER)).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: '+ New Portfolio' }));
      fireEvent.click(within(form()).getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByPlaceholderText(PLACEHOLDER)).toBeNull();
    });

    test('rejects an empty name', () => {
      renderManager();
      fireEvent.click(screen.getByRole('button', { name: '+ New Portfolio' }));

      fireEvent.click(screen.getByRole('button', { name: 'Create' }));

      expect(screen.getByText(EMPTY_NAME_ERROR)).toHaveClass('portfolio-manager__message--error');
      expect(storage.savePortfolio).not.toHaveBeenCalled();
      expect(nameInput()).toBeInTheDocument();
    });

    test('creates a fresh sample-based portfolio, activates it, and closes the form', () => {
      usePortfolioStore.setState({
        customLots: [
          { id: 'lot-1', symbol: 'AAPL', tradeDate: '2024-01-01', shares: 1, pricePerShare: 1 },
        ],
      });
      renderManager();
      fireEvent.click(screen.getByRole('button', { name: '+ New Portfolio' }));

      fireEvent.change(nameInput(), { target: { value: '  Speculative ' } });
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));

      const state = usePortfolioStore.getState();
      expect(state.activePortfolioName).toBe('Speculative');
      expect(state.activePortfolioId).toEqual(NEW_ID);
      expect(state.customLots).toEqual([]);
      expect(state.snapshot.equityMetadata.map(equity => equity.symbol)).toEqual(['AAPL', 'MSFT']);
      expect(state.snapshot.equityMetadata.every(equity => equity.shares === 0)).toBe(true);
      expect(storage.savePortfolio).toHaveBeenCalledWith(
        state.activePortfolioId,
        'Speculative',
        state.snapshot,
        []
      );
      expect(storage.setActivePortfolioId).toHaveBeenCalledWith(state.activePortfolioId);
      expect(screen.getByText('Created new portfolio: Speculative')).toHaveClass(
        'portfolio-manager__message--success'
      );
      expect(screen.queryByPlaceholderText(PLACEHOLDER)).toBeNull();
      expect(currentPortfolio()).toHaveTextContent('Speculative');
    });

    test('submits on Enter and ignores other keys', () => {
      renderManager();
      fireEvent.click(screen.getByRole('button', { name: '+ New Portfolio' }));
      fireEvent.change(nameInput(), { target: { value: 'Momentum' } });

      fireEvent.keyDown(nameInput(), { key: 'Escape' });
      expect(storage.savePortfolio).not.toHaveBeenCalled();

      fireEvent.keyDown(nameInput(), { key: 'Enter' });
      expect(storage.savePortfolio).toHaveBeenCalledWith(NEW_ID, 'Momentum', expect.anything(), []);
      expect(screen.getByText('Created new portfolio: Momentum')).toBeInTheDocument();
    });
  });

  describe('saved portfolio list', () => {
    test('shows the empty state when nothing is saved', () => {
      vi.mocked(storage.getPortfolioMetadataList).mockReturnValue([]);
      renderManager();

      expect(screen.getByRole('heading', { name: 'Saved Portfolios (0)' })).toBeInTheDocument();
      expect(
        screen.getByText('No saved portfolios yet. Create one to get started!')
      ).toBeInTheDocument();
      expect(document.querySelector('.portfolio-list')).toBeNull();
    });

    test('lists each portfolio with dates, highlights the active one, and hides its Load', () => {
      renderManager();

      expect(screen.getByRole('heading', { name: 'Saved Portfolios (2)' })).toBeInTheDocument();

      const growthItem = listItem(growth);
      expect(growthItem).toHaveClass('portfolio-item--active');
      expect(growthItem).toHaveTextContent('Created: Jan 10, 2025');
      expect(growthItem).toHaveTextContent('Updated: Feb 1, 2025');
      expect(within(growthItem).queryByRole('button', { name: 'Load' })).toBeNull();
      expect(
        within(growthItem)
          .getAllByRole('button')
          .map(button => button.textContent)
      ).toEqual(['Rename', 'Delete']);

      const incomeItem = listItem(income);
      expect(incomeItem).not.toHaveClass('portfolio-item--active');
      expect(incomeItem).toHaveTextContent('Created: Jan 20, 2025');
      expect(incomeItem).toHaveTextContent('Updated: Jan 25, 2025');
      expect(
        within(incomeItem)
          .getAllByRole('button')
          .map(button => button.textContent)
      ).toEqual(['Load', 'Rename', 'Delete']);
    });
  });

  describe('load', () => {
    test('switches the store to the selected portfolio and moves the active marker', () => {
      renderManager();

      fireEvent.click(itemButton(income, 'Load'));

      expect(storage.loadPortfolioById).toHaveBeenCalledWith(income.id);
      expect(screen.getByText('Loaded portfolio: Income')).toHaveClass(
        'portfolio-manager__message--success'
      );

      const state = usePortfolioStore.getState();
      expect(state.activePortfolioId).toBe(income.id);
      expect(state.activePortfolioName).toBe('Income');
      expect(state.snapshot.asOf).toBe('2024-11-30');
      expect(state.customLots).toEqual(savedIncome.customLots);

      expect(currentPortfolio()).toHaveTextContent('Income');
      expect(listItem(income)).toHaveClass('portfolio-item--active');
      expect(within(listItem(income)).queryByRole('button', { name: 'Load' })).toBeNull();
      expect(itemButton(growth, 'Load')).toBeInTheDocument();
    });

    test('reports a failure when the portfolio is missing from storage', () => {
      vi.mocked(storage.loadPortfolioById).mockReturnValue(null);
      renderManager();

      fireEvent.click(itemButton(income, 'Load'));

      expect(screen.getByText('Failed to load portfolio: Income')).toHaveClass(
        'portfolio-manager__message--error'
      );
      expect(usePortfolioStore.getState().activePortfolioId).toBe(growth.id);
      expect(usePortfolioStore.getState().snapshot).toBe(activeSnapshot);
    });
  });

  describe('delete', () => {
    test('asks for confirmation and stops when declined', () => {
      vi.mocked(window.confirm).mockReturnValue(false);
      renderManager();

      fireEvent.click(itemButton(income, 'Delete'));

      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete "Income"? This cannot be undone.'
      );
      expect(storage.deletePortfolio).not.toHaveBeenCalled();
      expect(message()).toBeNull();
    });

    test('deletes another portfolio and leaves the active one alone', () => {
      renderManager();

      fireEvent.click(itemButton(income, 'Delete'));

      expect(storage.deletePortfolio).toHaveBeenCalledWith(income.id);
      expect(screen.getByText('Deleted portfolio: Income')).toHaveClass(
        'portfolio-manager__message--success'
      );
      expect(usePortfolioStore.getState().activePortfolioId).toBe(growth.id);
      expect(currentPortfolio()).toHaveTextContent('Growth');
    });

    test('clears the current portfolio when the active one is deleted', () => {
      renderManager();

      fireEvent.click(itemButton(growth, 'Delete'));

      expect(storage.deletePortfolio).toHaveBeenCalledWith(growth.id);
      expect(screen.getByText('Deleted portfolio: Growth')).toBeInTheDocument();
      expect(usePortfolioStore.getState().activePortfolioId).toBeNull();
      expect(usePortfolioStore.getState().activePortfolioName).toBeNull();
      expect(currentPortfolio()).toHaveTextContent('Unsaved Portfolio');
    });

    test('reports a failure when storage refuses the delete', () => {
      vi.mocked(storage.deletePortfolio).mockReturnValue(false);
      renderManager();

      fireEvent.click(itemButton(income, 'Delete'));

      expect(screen.getByText('Failed to delete portfolio: Income')).toHaveClass(
        'portfolio-manager__message--error'
      );
      expect(usePortfolioStore.getState().activePortfolioId).toBe(growth.id);
    });
  });

  describe('rename', () => {
    test('opens an inline editor prefilled with the current name', () => {
      renderManager();

      fireEvent.click(itemButton(income, 'Rename'));

      const input = renameInput(income);
      expect(input).toHaveValue('Income');
      expect(input).toHaveFocus();
      expect(within(listItem(income)).queryByRole('button', { name: 'Load' })).toBeNull();
      expect(within(listItem(income)).getByRole('button', { name: 'Save' })).toBeInTheDocument();
      // Other rows keep their normal controls.
      expect(itemButton(growth, 'Rename')).toBeInTheDocument();
    });

    test('cancels from the Cancel button or Escape without renaming', () => {
      renderManager();

      fireEvent.click(itemButton(income, 'Rename'));
      fireEvent.change(renameInput(income), { target: { value: 'Discarded' } });
      fireEvent.click(itemButton(income, 'Cancel'));
      expect(within(listItem(income)).queryByRole('textbox')).toBeNull();

      fireEvent.click(itemButton(income, 'Rename'));
      expect(renameInput(income)).toHaveValue('Income');
      fireEvent.keyDown(renameInput(income), { key: 'Escape' });
      expect(within(listItem(income)).queryByRole('textbox')).toBeNull();

      expect(storage.renamePortfolio).not.toHaveBeenCalled();
      expect(message()).toBeNull();
    });

    test('rejects a blank name and keeps the editor open', () => {
      renderManager();
      fireEvent.click(itemButton(income, 'Rename'));

      fireEvent.change(renameInput(income), { target: { value: '  ' } });
      fireEvent.click(itemButton(income, 'Save'));

      expect(screen.getByText(EMPTY_NAME_ERROR)).toHaveClass('portfolio-manager__message--error');
      expect(storage.renamePortfolio).not.toHaveBeenCalled();
      expect(renameInput(income)).toHaveValue('  ');
    });

    test('renames from the Save button with the trimmed name and closes the editor', () => {
      renderManager();
      fireEvent.click(itemButton(income, 'Rename'));

      fireEvent.change(renameInput(income), { target: { value: '  Income Plus ' } });
      fireEvent.click(itemButton(income, 'Save'));

      expect(storage.renamePortfolio).toHaveBeenCalledWith(income.id, 'Income Plus');
      expect(screen.getByText('Renamed portfolio to: Income Plus')).toHaveClass(
        'portfolio-manager__message--success'
      );
      expect(within(listItem(income)).queryByRole('textbox')).toBeNull();
      // Renaming a non-active portfolio leaves the current portfolio untouched.
      expect(usePortfolioStore.getState().activePortfolioName).toBe('Growth');
    });

    test('renames on Enter, ignores other keys, and updates the active name', () => {
      renderManager();
      fireEvent.click(itemButton(growth, 'Rename'));
      fireEvent.change(renameInput(growth), { target: { value: 'Growth Two' } });

      fireEvent.keyDown(renameInput(growth), { key: 'Tab' });
      expect(storage.renamePortfolio).not.toHaveBeenCalled();
      expect(renameInput(growth)).toBeInTheDocument();

      fireEvent.keyDown(renameInput(growth), { key: 'Enter' });
      expect(storage.renamePortfolio).toHaveBeenCalledWith(growth.id, 'Growth Two');
      expect(screen.getByText('Renamed portfolio to: Growth Two')).toBeInTheDocument();
      expect(usePortfolioStore.getState().activePortfolioName).toBe('Growth Two');
      expect(currentPortfolio()).toHaveTextContent('Growth Two');
      expect(within(listItem(growth)).queryByRole('textbox')).toBeNull();
    });

    test('reports a failure and keeps the editor open when storage refuses', () => {
      vi.mocked(storage.renamePortfolio).mockReturnValue(false);
      renderManager();
      fireEvent.click(itemButton(income, 'Rename'));

      fireEvent.change(renameInput(income), { target: { value: 'Blocked' } });
      fireEvent.click(itemButton(income, 'Save'));

      expect(screen.getByText('Failed to rename portfolio')).toHaveClass(
        'portfolio-manager__message--error'
      );
      expect(renameInput(income)).toHaveValue('Blocked');
      expect(usePortfolioStore.getState().activePortfolioName).toBe('Growth');
    });
  });
});

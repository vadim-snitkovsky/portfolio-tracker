import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePortfolioStore } from './portfolioStore';
import type { PortfolioSnapshot, PurchaseLot } from '../types/portfolio';
import * as storage from '../utils/storage';
import * as marketData from '../services/marketData';

// Mock the storage module
vi.mock('../utils/storage', () => ({
  loadCustomLots: vi.fn(() => []),
  persistCustomLots: vi.fn(),
  loadSnapshot: vi.fn(() => null),
  persistSnapshot: vi.fn(),
  savePortfolio: vi.fn((id, name, snapshot, lots) => ({
    id,
    name,
    snapshot,
    customLots: lots,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })),
  loadPortfolioById: vi.fn(() => null),
  deletePortfolio: vi.fn(() => true),
  renamePortfolio: vi.fn(() => true),
  getPortfolioMetadataList: vi.fn(() => []),
  getActivePortfolioId: vi.fn(() => null),
  setActivePortfolioId: vi.fn()
}));

// Mock the marketData module
vi.mock('../services/marketData', () => ({
  fetchQuotes: vi.fn(() => Promise.resolve([])),
  mergeQuotesIntoPositions: vi.fn((positions) => positions),
  fetchDividends: vi.fn(() => Promise.resolve([])),
  mergeDividendsIntoPositions: vi.fn((positions) => positions)
}));

describe('portfolioStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    
    // Reset the store to initial state
    const { result } = renderHook(() => usePortfolioStore());
    act(() => {
      result.current.loadPortfolio(
        { asOf: '2025-01-01', seedAmount: 10000, equities: [] },
        []
      );
    });
  });

  describe('initial state', () => {
    it('should have initial snapshot', () => {
      const { result } = renderHook(() => usePortfolioStore());
      expect(result.current.snapshot).toBeDefined();
      expect(result.current.snapshot.asOf).toBeDefined();
      expect(Array.isArray(result.current.snapshot.equities)).toBe(true);
    });

    it('should have initial customLots', () => {
      const { result } = renderHook(() => usePortfolioStore());
      expect(Array.isArray(result.current.customLots)).toBe(true);
    });

    it('should have null activePortfolioId initially', () => {
      const { result } = renderHook(() => usePortfolioStore());
      expect(result.current.activePortfolioId).toBeNull();
    });

    it('should have null activePortfolioName initially', () => {
      const { result } = renderHook(() => usePortfolioStore());
      expect(result.current.activePortfolioName).toBeNull();
    });

    it('should have quote status with isLoading false', () => {
      const { result } = renderHook(() => usePortfolioStore());
      expect(result.current.quoteStatus.isLoading).toBe(false);
    });

    it('should have dividend status with isLoading false', () => {
      const { result } = renderHook(() => usePortfolioStore());
      expect(result.current.dividendStatus.isLoading).toBe(false);
    });
  });

  describe('setSnapshot', () => {
    it('should update snapshot', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const newSnapshot: PortfolioSnapshot = {
        asOf: '2025-01-15',
        seedAmount: 20000,
        equities: []
      };

      act(() => {
        result.current.setSnapshot(newSnapshot);
      });

      expect(result.current.snapshot.asOf).toBe('2025-01-15');
      expect(result.current.snapshot.seedAmount).toBe(20000);
    });

    it('should sanitize equities (set shares to 0)', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const newSnapshot: PortfolioSnapshot = {
        asOf: '2025-01-15',
        seedAmount: 20000,
        equities: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            sector: 'Technology',
            shares: 100,
            averageCost: 150,
            currentPrice: 180,
            dividends: [],
            navHistory: []
          }
        ]
      };

      act(() => {
        result.current.setSnapshot(newSnapshot);
      });

      expect(result.current.snapshot.equities[0].shares).toBe(0);
    });

    it('should persist snapshot to storage', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const newSnapshot: PortfolioSnapshot = {
        asOf: '2025-01-15',
        seedAmount: 20000,
        equities: []
      };

      act(() => {
        result.current.setSnapshot(newSnapshot);
      });

      expect(storage.persistSnapshot).toHaveBeenCalled();
    });
  });

  describe('addPurchaseLot', () => {
    it('should add a new purchase lot', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const lot: PurchaseLot = {
        id: 'lot-1',
        symbol: 'AAPL',
        tradeDate: '2025-01-01',
        shares: 10,
        pricePerShare: 150
      };

      act(() => {
        result.current.addPurchaseLot(lot);
      });

      expect(result.current.customLots).toContainEqual(lot);
    });

    it('should persist lots to storage', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const lot: PurchaseLot = {
        id: 'lot-1',
        symbol: 'AAPL',
        tradeDate: '2025-01-01',
        shares: 10,
        pricePerShare: 150
      };

      act(() => {
        result.current.addPurchaseLot(lot);
      });

      expect(storage.persistCustomLots).toHaveBeenCalled();
    });

    it('should add multiple lots', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const lot1: PurchaseLot = {
        id: 'lot-1',
        symbol: 'AAPL',
        tradeDate: '2025-01-01',
        shares: 10,
        pricePerShare: 150
      };
      const lot2: PurchaseLot = {
        id: 'lot-2',
        symbol: 'MSFT',
        tradeDate: '2025-01-02',
        shares: 20,
        pricePerShare: 380
      };

      act(() => {
        result.current.addPurchaseLot(lot1);
        result.current.addPurchaseLot(lot2);
      });

      expect(result.current.customLots).toContainEqual(lot1);
      expect(result.current.customLots).toContainEqual(lot2);
    });
  });

  describe('updatePurchaseLot', () => {
    it('should update an existing lot', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const lot: PurchaseLot = {
        id: 'lot-1',
        symbol: 'AAPL',
        tradeDate: '2025-01-01',
        shares: 10,
        pricePerShare: 150
      };

      act(() => {
        result.current.addPurchaseLot(lot);
        result.current.updatePurchaseLot('lot-1', { shares: 20 });
      });

      const updatedLot = result.current.customLots.find(l => l.id === 'lot-1');
      expect(updatedLot?.shares).toBe(20);
    });

    it('should update multiple fields', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const lot: PurchaseLot = {
        id: 'lot-1',
        symbol: 'AAPL',
        tradeDate: '2025-01-01',
        shares: 10,
        pricePerShare: 150
      };

      act(() => {
        result.current.addPurchaseLot(lot);
        result.current.updatePurchaseLot('lot-1', {
          shares: 20,
          pricePerShare: 160,
          tradeDate: '2025-01-02'
        });
      });

      const updatedLot = result.current.customLots.find(l => l.id === 'lot-1');
      expect(updatedLot?.shares).toBe(20);
      expect(updatedLot?.pricePerShare).toBe(160);
      expect(updatedLot?.tradeDate).toBe('2025-01-02');
    });

    it('should not update non-existent lot', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const initialLength = result.current.customLots.length;

      act(() => {
        result.current.updatePurchaseLot('non-existent', { shares: 20 });
      });

      expect(result.current.customLots.length).toBe(initialLength);
    });

    it('should persist updated lots to storage', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const lot: PurchaseLot = {
        id: 'lot-1',
        symbol: 'AAPL',
        tradeDate: '2025-01-01',
        shares: 10,
        pricePerShare: 150
      };

      act(() => {
        result.current.addPurchaseLot(lot);
        vi.clearAllMocks();
        result.current.updatePurchaseLot('lot-1', { shares: 20 });
      });

      expect(storage.persistCustomLots).toHaveBeenCalled();
    });
  });

  describe('removePurchaseLot', () => {
    it('should remove a lot', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const lot: PurchaseLot = {
        id: 'lot-1',
        symbol: 'AAPL',
        tradeDate: '2025-01-01',
        shares: 10,
        pricePerShare: 150
      };

      act(() => {
        result.current.addPurchaseLot(lot);
        result.current.removePurchaseLot('lot-1');
      });

      expect(result.current.customLots.find(l => l.id === 'lot-1')).toBeUndefined();
    });

    it('should persist after removal', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const lot: PurchaseLot = {
        id: 'lot-1',
        symbol: 'AAPL',
        tradeDate: '2025-01-01',
        shares: 10,
        pricePerShare: 150
      };

      act(() => {
        result.current.addPurchaseLot(lot);
        vi.clearAllMocks();
        result.current.removePurchaseLot('lot-1');
      });

      expect(storage.persistCustomLots).toHaveBeenCalled();
      expect(storage.persistSnapshot).toHaveBeenCalled();
    });
  });

  describe('removeDividend', () => {
    it('should remove a dividend from an equity', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const snapshot: PortfolioSnapshot = {
        asOf: '2025-01-15',
        seedAmount: 10000,
        equities: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            sector: 'Technology',
            shares: 0,
            averageCost: 150,
            currentPrice: 180,
            dividends: [
              { id: 'div-1', date: '2025-01-01', amountPerShare: 0.25 },
              { id: 'div-2', date: '2025-01-02', amountPerShare: 0.30 }
            ],
            navHistory: []
          }
        ]
      };

      act(() => {
        result.current.setSnapshot(snapshot);
        result.current.removeDividend('AAPL', 'div-1');
      });

      const equity = result.current.snapshot.equities.find(e => e.symbol === 'AAPL');
      expect(equity?.dividends).toHaveLength(1);
      expect(equity?.dividends[0].id).toBe('div-2');
    });

    it('should be case-insensitive for symbol', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const snapshot: PortfolioSnapshot = {
        asOf: '2025-01-15',
        seedAmount: 10000,
        equities: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            sector: 'Technology',
            shares: 0,
            averageCost: 150,
            currentPrice: 180,
            dividends: [
              { id: 'div-1', date: '2025-01-01', amountPerShare: 0.25 }
            ],
            navHistory: []
          }
        ]
      };

      act(() => {
        result.current.setSnapshot(snapshot);
        result.current.removeDividend('aapl', 'div-1');
      });

      const equity = result.current.snapshot.equities.find(e => e.symbol === 'AAPL');
      expect(equity?.dividends).toHaveLength(0);
    });

    it('should persist after removing dividend', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const snapshot: PortfolioSnapshot = {
        asOf: '2025-01-15',
        seedAmount: 10000,
        equities: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            sector: 'Technology',
            shares: 0,
            averageCost: 150,
            currentPrice: 180,
            dividends: [
              { id: 'div-1', date: '2025-01-01', amountPerShare: 0.25 }
            ],
            navHistory: []
          }
        ]
      };

      act(() => {
        result.current.setSnapshot(snapshot);
        vi.clearAllMocks();
        result.current.removeDividend('AAPL', 'div-1');
      });

      expect(storage.persistSnapshot).toHaveBeenCalled();
    });
  });

  describe('loadPortfolio', () => {
    it('should load a new portfolio', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const snapshot: PortfolioSnapshot = {
        asOf: '2025-01-20',
        seedAmount: 50000,
        equities: []
      };
      const lots: PurchaseLot[] = [
        {
          id: 'lot-1',
          symbol: 'AAPL',
          tradeDate: '2025-01-01',
          shares: 10,
          pricePerShare: 150
        }
      ];

      act(() => {
        result.current.loadPortfolio(snapshot, lots);
      });

      expect(result.current.snapshot.asOf).toBe('2025-01-20');
      expect(result.current.snapshot.seedAmount).toBe(50000);
      expect(result.current.customLots).toContainEqual(lots[0]);
    });

    it('should sanitize snapshot equities', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const snapshot: PortfolioSnapshot = {
        asOf: '2025-01-20',
        seedAmount: 50000,
        equities: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            sector: 'Technology',
            shares: 100,
            averageCost: 150,
            currentPrice: 180,
            dividends: [],
            navHistory: []
          }
        ]
      };

      act(() => {
        result.current.loadPortfolio(snapshot, []);
      });

      expect(result.current.snapshot.equities[0].shares).toBe(0);
    });

    it('should persist loaded portfolio', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const snapshot: PortfolioSnapshot = {
        asOf: '2025-01-20',
        seedAmount: 50000,
        equities: []
      };

      act(() => {
        result.current.loadPortfolio(snapshot, []);
      });

      expect(storage.persistCustomLots).toHaveBeenCalled();
    });
  });

  describe('refreshQuotes', () => {
    it('should set loading state while fetching', async () => {
      const { result } = renderHook(() => usePortfolioStore());

      // Add a symbol so refreshQuotes actually runs
      act(() => {
        result.current.addPurchaseLot({
          id: 'lot-1',
          symbol: 'AAPL',
          tradeDate: '2025-01-01',
          shares: 10,
          pricePerShare: 150
        });
      });

      let resolvePromise: any;
      vi.mocked(marketData.fetchQuotes).mockImplementation(() =>
        new Promise(resolve => {
          resolvePromise = resolve;
        })
      );

      let promise: Promise<any>;
      act(() => {
        promise = result.current.refreshQuotes();
      });

      // Check loading state immediately after calling
      expect(result.current.quoteStatus.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise([]);
        await promise;
      });

      expect(result.current.quoteStatus.isLoading).toBe(false);
    });

    it('should update lastUpdated after successful fetch', async () => {
      const { result } = renderHook(() => usePortfolioStore());

      // Add a symbol so refreshQuotes actually runs
      act(() => {
        result.current.addPurchaseLot({
          id: 'lot-1',
          symbol: 'AAPL',
          tradeDate: '2025-01-01',
          shares: 10,
          pricePerShare: 150
        });
      });

      vi.mocked(marketData.fetchQuotes).mockResolvedValue([]);

      await act(async () => {
        await result.current.refreshQuotes();
      });

      expect(result.current.quoteStatus.lastUpdated).toBeDefined();
      expect(result.current.quoteStatus.isLoading).toBe(false);
    });

    it('should handle fetch errors', async () => {
      const { result } = renderHook(() => usePortfolioStore());

      vi.mocked(marketData.fetchQuotes).mockRejectedValue(new Error('Network error'));

      await act(async () => {
        try {
          await result.current.refreshQuotes();
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.quoteStatus.isLoading).toBe(false);
    });
  });

  describe('refreshDividends', () => {
    it('should set loading state while fetching', async () => {
      const { result } = renderHook(() => usePortfolioStore());

      // Add a symbol so refreshDividends actually runs
      act(() => {
        result.current.addPurchaseLot({
          id: 'lot-1',
          symbol: 'AAPL',
          tradeDate: '2025-01-01',
          shares: 10,
          pricePerShare: 150
        });
      });

      let resolvePromise: any;
      vi.mocked(marketData.fetchDividends).mockImplementation(() =>
        new Promise(resolve => {
          resolvePromise = resolve;
        })
      );

      let promise: Promise<any>;
      act(() => {
        promise = result.current.refreshDividends(12);
      });

      // Check loading state immediately after calling
      expect(result.current.dividendStatus.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise([]);
        await promise;
      });

      expect(result.current.dividendStatus.isLoading).toBe(false);
    });

    it('should update lastUpdated after successful fetch', async () => {
      const { result } = renderHook(() => usePortfolioStore());

      // Add a symbol so refreshDividends actually runs
      act(() => {
        result.current.addPurchaseLot({
          id: 'lot-1',
          symbol: 'AAPL',
          tradeDate: '2025-01-01',
          shares: 10,
          pricePerShare: 150
        });
      });

      vi.mocked(marketData.fetchDividends).mockResolvedValue([]);

      await act(async () => {
        await result.current.refreshDividends(12);
      });

      expect(result.current.dividendStatus.lastUpdated).toBeDefined();
      expect(result.current.dividendStatus.isLoading).toBe(false);
    });
  });

  describe('saveCurrentPortfolio', () => {
    it('should save current portfolio with a name', () => {
      const { result } = renderHook(() => usePortfolioStore());

      act(() => {
        result.current.saveCurrentPortfolio('My Portfolio');
      });

      expect(storage.savePortfolio).toHaveBeenCalled();
    });

    it('should return saved portfolio object', () => {
      const { result } = renderHook(() => usePortfolioStore());

      let savedPortfolio: any;
      act(() => {
        savedPortfolio = result.current.saveCurrentPortfolio('My Portfolio');
      });

      expect(savedPortfolio).toBeDefined();
      expect(savedPortfolio.name).toBe('My Portfolio');
    });

    it('should set active portfolio ID after saving', () => {
      const { result } = renderHook(() => usePortfolioStore());

      act(() => {
        result.current.saveCurrentPortfolio('My Portfolio');
      });

      expect(storage.setActivePortfolioId).toHaveBeenCalled();
    });

    it('should set active portfolio name after saving', () => {
      const { result } = renderHook(() => usePortfolioStore());

      act(() => {
        result.current.saveCurrentPortfolio('My Portfolio');
      });

      expect(result.current.activePortfolioName).toBe('My Portfolio');
    });
  });

  describe('loadSavedPortfolio', () => {
    it('should load a saved portfolio by ID', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const savedPortfolio = {
        id: 'portfolio-1',
        name: 'Test Portfolio',
        snapshot: {
          asOf: '2025-01-15',
          seedAmount: 30000,
          equities: []
        },
        customLots: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      vi.mocked(storage.loadPortfolioById).mockReturnValue(savedPortfolio);

      act(() => {
        result.current.loadSavedPortfolio('portfolio-1');
      });

      expect(storage.loadPortfolioById).toHaveBeenCalledWith('portfolio-1');
      expect(result.current.snapshot.seedAmount).toBe(30000);
    });

    it('should return false if portfolio not found', () => {
      const { result } = renderHook(() => usePortfolioStore());

      vi.mocked(storage.loadPortfolioById).mockReturnValue(null);

      let loadResult: boolean = false;
      act(() => {
        loadResult = result.current.loadSavedPortfolio('non-existent');
      });

      expect(loadResult).toBe(false);
    });

    it('should return true if portfolio loaded successfully', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const savedPortfolio = {
        id: 'portfolio-1',
        name: 'Test Portfolio',
        snapshot: {
          asOf: '2025-01-15',
          seedAmount: 30000,
          equities: []
        },
        customLots: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      vi.mocked(storage.loadPortfolioById).mockReturnValue(savedPortfolio);

      let loadResult: boolean = false;
      act(() => {
        loadResult = result.current.loadSavedPortfolio('portfolio-1');
      });

      expect(loadResult).toBe(true);
    });

    it('should set active portfolio ID and name', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const savedPortfolio = {
        id: 'portfolio-1',
        name: 'Test Portfolio',
        snapshot: {
          asOf: '2025-01-15',
          seedAmount: 30000,
          equities: []
        },
        customLots: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      vi.mocked(storage.loadPortfolioById).mockReturnValue(savedPortfolio);

      act(() => {
        result.current.loadSavedPortfolio('portfolio-1');
      });

      expect(result.current.activePortfolioId).toBe('portfolio-1');
      expect(result.current.activePortfolioName).toBe('Test Portfolio');
    });
  });

  describe('deleteSavedPortfolio', () => {
    it('should delete a portfolio by ID', () => {
      const { result } = renderHook(() => usePortfolioStore());

      vi.mocked(storage.deletePortfolio).mockReturnValue(true);

      act(() => {
        result.current.deleteSavedPortfolio('portfolio-1');
      });

      expect(storage.deletePortfolio).toHaveBeenCalledWith('portfolio-1');
    });

    it('should return true if deletion successful', () => {
      const { result } = renderHook(() => usePortfolioStore());

      vi.mocked(storage.deletePortfolio).mockReturnValue(true);

      let deleteResult: boolean = false;
      act(() => {
        deleteResult = result.current.deleteSavedPortfolio('portfolio-1');
      });

      expect(deleteResult).toBe(true);
    });

    it('should return false if deletion failed', () => {
      const { result } = renderHook(() => usePortfolioStore());

      vi.mocked(storage.deletePortfolio).mockReturnValue(false);

      let deleteResult: boolean = true;
      act(() => {
        deleteResult = result.current.deleteSavedPortfolio('non-existent');
      });

      expect(deleteResult).toBe(false);
    });
  });

  describe('renameSavedPortfolio', () => {
    it('should rename a portfolio', () => {
      const { result } = renderHook(() => usePortfolioStore());

      vi.mocked(storage.renamePortfolio).mockReturnValue(true);

      act(() => {
        result.current.renameSavedPortfolio('portfolio-1', 'New Name');
      });

      expect(storage.renamePortfolio).toHaveBeenCalledWith('portfolio-1', 'New Name');
    });

    it('should return true if rename successful', () => {
      const { result } = renderHook(() => usePortfolioStore());

      vi.mocked(storage.renamePortfolio).mockReturnValue(true);

      let renameResult: boolean = false;
      act(() => {
        renameResult = result.current.renameSavedPortfolio('portfolio-1', 'New Name');
      });

      expect(renameResult).toBe(true);
    });

    it('should update activePortfolioName if renaming active portfolio', () => {
      const { result } = renderHook(() => usePortfolioStore());

      vi.mocked(storage.renamePortfolio).mockReturnValue(true);

      act(() => {
        // Set active portfolio
        result.current.activePortfolioId = 'portfolio-1';
        result.current.activePortfolioName = 'Old Name';

        result.current.renameSavedPortfolio('portfolio-1', 'New Name');
      });

      expect(result.current.activePortfolioName).toBe('New Name');
    });
  });

  describe('getSavedPortfolios', () => {
    it('should return list of saved portfolios', () => {
      const { result } = renderHook(() => usePortfolioStore());
      const portfolios = [
        {
          id: 'portfolio-1',
          name: 'Portfolio 1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'portfolio-2',
          name: 'Portfolio 2',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      vi.mocked(storage.getPortfolioMetadataList).mockReturnValue(portfolios);

      let result_portfolios: any[] = [];
      act(() => {
        result_portfolios = result.current.getSavedPortfolios();
      });

      expect(result_portfolios).toHaveLength(2);
      expect(result_portfolios[0].name).toBe('Portfolio 1');
    });

    it('should return empty array if no portfolios', () => {
      const { result } = renderHook(() => usePortfolioStore());

      vi.mocked(storage.getPortfolioMetadataList).mockReturnValue([]);

      let result_portfolios: any[] = [];
      act(() => {
        result_portfolios = result.current.getSavedPortfolios();
      });

      expect(result_portfolios).toHaveLength(0);
    });
  });

  describe('createNewPortfolio', () => {
    it('should create a new empty portfolio', () => {
      const { result } = renderHook(() => usePortfolioStore());

      act(() => {
        result.current.createNewPortfolio('New Portfolio');
      });

      expect(storage.savePortfolio).toHaveBeenCalled();
    });

    it('should set active portfolio to new portfolio', () => {
      const { result } = renderHook(() => usePortfolioStore());

      act(() => {
        result.current.createNewPortfolio('New Portfolio');
      });

      expect(result.current.activePortfolioName).toBe('New Portfolio');
    });

    it('should reset snapshot to sample portfolio state', () => {
      const { result } = renderHook(() => usePortfolioStore());

      // First add some data
      act(() => {
        result.current.setSnapshot({
          asOf: '2025-01-15',
          seedAmount: 50000,
          equities: []
        });
      });

      // Then create new portfolio
      act(() => {
        result.current.createNewPortfolio('New Portfolio');
      });

      // Should reset to sample portfolio's seed amount (90000)
      expect(result.current.snapshot.seedAmount).toBe(90000);
      expect(result.current.customLots).toHaveLength(0);
    });
  });
});

describe('calculateEquityMetrics', () => {
  it('should calculate metrics for an equity', async () => {
    const { calculateEquityMetrics } = await import('./portfolioStore');

    const equity: EquityPosition = {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      sector: 'Technology',
      shares: 100,
      averageCost: 150,
      currentPrice: 180,
      dividends: [
        { id: 'div-1', date: '2024-01-15', amountPerShare: 0.25 },
        { id: 'div-2', date: '2024-04-15', amountPerShare: 0.25 }
      ],
      navHistory: [
        { date: '2024-01-01', value: 175 },
        { date: '2024-04-01', value: 190 },
        { date: '2024-07-01', value: 180 }
      ]
    };

    const metrics = calculateEquityMetrics(equity);

    expect(metrics.costBasis).toBe(15000); // 100 * 150
    expect(metrics.marketValue).toBe(18000); // 100 * 180
    expect(metrics.totalDividends).toBe(50); // (0.25 + 0.25) * 100
    expect(metrics.totalReturn).toBe(3050); // 18000 + 50 - 15000
    expect(metrics.roi).toBeCloseTo(20.33, 1); // (3050 / 15000) * 100
    expect(metrics.dividendYieldOnCost).toBeCloseTo(0.33, 1); // (50 / 15000) * 100
    expect(metrics.navPeak).toBe(190);
    expect(metrics.navDecayPercent).toBeCloseTo(5.26, 1); // ((190 - 180) / 190) * 100
  });

  it('should handle zero shares', async () => {
    const { calculateEquityMetrics } = await import('./portfolioStore');

    const equity: EquityPosition = {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      sector: 'Technology',
      shares: 0,
      averageCost: 150,
      currentPrice: 180,
      dividends: [],
      navHistory: []
    };

    const metrics = calculateEquityMetrics(equity);

    expect(metrics.costBasis).toBe(0);
    expect(metrics.marketValue).toBe(0);
    expect(metrics.totalDividends).toBe(0);
    expect(metrics.totalReturn).toBe(0);
    expect(metrics.roi).toBe(0);
  });
});

describe('calculatePortfolioMetrics', () => {
  it('should calculate portfolio-wide metrics', async () => {
    const { calculatePortfolioMetrics } = await import('./portfolioStore');

    const equities: EquityPosition[] = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        sector: 'Technology',
        shares: 100,
        averageCost: 150,
        currentPrice: 180,
        dividends: [
          { id: 'div-1', date: '2024-01-15', amountPerShare: 0.25 }
        ],
        navHistory: []
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        sector: 'Technology',
        shares: 50,
        averageCost: 300,
        currentPrice: 380,
        dividends: [
          { id: 'div-1', date: '2024-01-15', amountPerShare: 0.62 }
        ],
        navHistory: []
      }
    ];

    const metrics = calculatePortfolioMetrics(equities);

    expect(metrics.totalCostBasis).toBe(30000); // (100*150) + (50*300)
    expect(metrics.totalMarketValue).toBe(37000); // (100*180) + (50*380)
    expect(metrics.totalDividends).toBe(56); // (100*0.25) + (50*0.62)
    expect(metrics.totalReturn).toBe(7056); // 37000 + 56 - 30000
    expect(metrics.roi).toBeCloseTo(23.52, 1); // (7056 / 30000) * 100
    expect(metrics.incomeYieldOnCost).toBeCloseTo(0.19, 1); // (56 / 30000) * 100
  });

  it('should handle empty portfolio', async () => {
    const { calculatePortfolioMetrics } = await import('./portfolioStore');

    const metrics = calculatePortfolioMetrics([]);

    expect(metrics.totalCostBasis).toBe(0);
    expect(metrics.totalMarketValue).toBe(0);
    expect(metrics.totalDividends).toBe(0);
    expect(metrics.totalReturn).toBe(0);
    expect(metrics.roi).toBe(0);
    expect(metrics.incomeYieldOnCost).toBe(0);
  });

  it('should handle positions with no dividends', async () => {
    const { calculatePortfolioMetrics } = await import('./portfolioStore');

    const equities: EquityPosition[] = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        sector: 'Technology',
        shares: 100,
        averageCost: 150,
        currentPrice: 180,
        dividends: [],
        navHistory: []
      }
    ];

    const metrics = calculatePortfolioMetrics(equities);

    expect(metrics.totalCostBasis).toBe(15000);
    expect(metrics.totalMarketValue).toBe(18000);
    expect(metrics.totalDividends).toBe(0);
    expect(metrics.totalReturn).toBe(3000);
  });

  it('should handle positions with zero shares', async () => {
    const { calculatePortfolioMetrics } = await import('./portfolioStore');

    const equities: EquityPosition[] = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        sector: 'Technology',
        shares: 0,
        averageCost: 150,
        currentPrice: 180,
        dividends: [],
        navHistory: []
      }
    ];

    const metrics = calculatePortfolioMetrics(equities);

    expect(metrics.totalCostBasis).toBe(0);
    expect(metrics.totalMarketValue).toBe(0);
  });
});

describe('deriveEquityViews', () => {
  it('should derive equity views with lots', async () => {
    const { deriveEquityViews } = await import('./portfolioStore');

    const snapshot: PortfolioSnapshot = {
      asOf: '2025-01-15',
      seedAmount: 10000,
      equities: [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          sector: 'Technology',
          shares: 0,
          averageCost: 150,
          currentPrice: 180,
          dividends: [
            { id: 'div-1', date: '2024-01-15', amountPerShare: 0.25 }
          ],
          navHistory: []
        }
      ]
    };

    const lots: PurchaseLot[] = [
      {
        id: 'lot-1',
        symbol: 'AAPL',
        tradeDate: '2024-01-01',
        shares: 100,
        pricePerShare: 150
      }
    ];

    const views = deriveEquityViews(snapshot, lots);

    expect(views).toHaveLength(1);
    expect(views[0].position.symbol).toBe('AAPL');
    expect(views[0].position.shares).toBe(100);
    expect(views[0].manualLots).toHaveLength(1);
    expect(views[0].manualTotalShares).toBe(100);
    expect(views[0].manualTotalCost).toBe(15000);
  });

  it('should handle lots-only symbols', async () => {
    const { deriveEquityViews } = await import('./portfolioStore');

    const snapshot: PortfolioSnapshot = {
      asOf: '2025-01-15',
      seedAmount: 10000,
      equities: []
    };

    const lots: PurchaseLot[] = [
      {
        id: 'lot-1',
        symbol: 'TSLA',
        tradeDate: '2024-01-01',
        shares: 50,
        pricePerShare: 200
      }
    ];

    const views = deriveEquityViews(snapshot, lots);

    expect(views).toHaveLength(1);
    expect(views[0].position.symbol).toBe('TSLA');
    expect(views[0].position.shares).toBe(50);
    expect(views[0].position.sector).toBe('Manual Entry');
  });

  it('should calculate dividends with shares owned', async () => {
    const { deriveEquityViews } = await import('./portfolioStore');

    const snapshot: PortfolioSnapshot = {
      asOf: '2025-01-15',
      seedAmount: 10000,
      equities: [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          sector: 'Technology',
          shares: 0,
          averageCost: 150,
          currentPrice: 180,
          dividends: [
            { id: 'div-1', date: '2024-02-01', amountPerShare: 0.25 },
            { id: 'div-2', date: '2024-05-01', amountPerShare: 0.25 }
          ],
          navHistory: []
        }
      ]
    };

    const lots: PurchaseLot[] = [
      {
        id: 'lot-1',
        symbol: 'AAPL',
        tradeDate: '2024-01-01',
        shares: 50,
        pricePerShare: 150
      },
      {
        id: 'lot-2',
        symbol: 'AAPL',
        tradeDate: '2024-03-01',
        shares: 50,
        pricePerShare: 160
      }
    ];

    const views = deriveEquityViews(snapshot, lots);

    expect(views[0].dividendsWithShares).toHaveLength(2);
    expect(views[0].dividendsWithShares[0].sharesOwned).toBe(50); // Only lot-1 owned at div-1 date
    expect(views[0].dividendsWithShares[1].sharesOwned).toBe(100); // Both lots owned at div-2 date
  });

  it('should filter dividends before earliest acquisition', async () => {
    const { deriveEquityViews } = await import('./portfolioStore');

    const snapshot: PortfolioSnapshot = {
      asOf: '2025-01-15',
      seedAmount: 10000,
      equities: [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          sector: 'Technology',
          shares: 0,
          averageCost: 150,
          currentPrice: 180,
          dividends: [
            { id: 'div-1', date: '2023-12-01', amountPerShare: 0.25 }, // Before acquisition
            { id: 'div-2', date: '2024-02-01', amountPerShare: 0.25 }  // After acquisition
          ],
          navHistory: []
        }
      ]
    };

    const lots: PurchaseLot[] = [
      {
        id: 'lot-1',
        symbol: 'AAPL',
        tradeDate: '2024-01-01',
        shares: 100,
        pricePerShare: 150
      }
    ];

    const views = deriveEquityViews(snapshot, lots);

    expect(views[0].dividendsWithShares).toHaveLength(1);
    expect(views[0].dividendsWithShares[0].id).toBe('div-2');
  });

  it('should handle multiple symbols', async () => {
    const { deriveEquityViews } = await import('./portfolioStore');

    const snapshot: PortfolioSnapshot = {
      asOf: '2025-01-15',
      seedAmount: 10000,
      equities: []
    };

    const lots: PurchaseLot[] = [
      {
        id: 'lot-1',
        symbol: 'AAPL',
        tradeDate: '2024-01-01',
        shares: 100,
        pricePerShare: 150
      },
      {
        id: 'lot-2',
        symbol: 'MSFT',
        tradeDate: '2024-01-01',
        shares: 50,
        pricePerShare: 300
      }
    ];

    const views = deriveEquityViews(snapshot, lots);

    expect(views).toHaveLength(2);
    expect(views[0].position.symbol).toBe('AAPL');
    expect(views[1].position.symbol).toBe('MSFT');
  });
});


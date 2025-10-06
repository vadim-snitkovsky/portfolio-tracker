import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadCustomLots,
  persistCustomLots,
  clearCustomLots,
  loadSnapshot,
  persistSnapshot,
  clearSnapshot,
  loadSavedPortfolios,
  saveSavedPortfolios,
  getActivePortfolioId,
  setActivePortfolioId,
  savePortfolio,
  loadPortfolioById,
  deletePortfolio,
  renamePortfolio,
  getPortfolioMetadataList,
} from './storage';
import type { SavedPortfolio, PortfolioSnapshot, PurchaseLot } from '../types/portfolio';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('loadCustomLots', () => {
    it('should return fallback when no data exists', () => {
      const fallback: PurchaseLot[] = [];
      const result = loadCustomLots(data => data as PurchaseLot[], fallback);
      expect(result).toEqual(fallback);
    });

    it('should load and parse custom lots from localStorage', () => {
      const lots: PurchaseLot[] = [
        { id: '1', symbol: 'AAPL', shares: 10, tradeDate: '2025-01-01', pricePerShare: 150 },
      ];
      localStorage.setItem('portfolio-custom-lots', JSON.stringify(lots));

      const result = loadCustomLots(data => data as PurchaseLot[], []);
      expect(result).toEqual(lots);
    });

    it('should return fallback on parse error', () => {
      localStorage.setItem('portfolio-custom-lots', 'invalid json');
      const fallback: PurchaseLot[] = [];
      const result = loadCustomLots(data => data as PurchaseLot[], fallback);
      expect(result).toEqual(fallback);
    });

    it('should use parser function to transform data', () => {
      const rawData = { test: 'data' };
      localStorage.setItem('portfolio-custom-lots', JSON.stringify(rawData));

      const parser = (data: unknown) => ({ transformed: true, original: data });
      const result = loadCustomLots(parser, { transformed: false, original: null });
      expect(result).toEqual({ transformed: true, original: rawData });
    });
  });

  describe('persistCustomLots', () => {
    it('should save custom lots to localStorage', () => {
      const lots: PurchaseLot[] = [
        { id: '1', symbol: 'AAPL', shares: 10, tradeDate: '2025-01-01', pricePerShare: 150 },
      ];
      persistCustomLots(lots);

      const stored = localStorage.getItem('portfolio-custom-lots');
      expect(stored).toBe(JSON.stringify(lots));
    });

    it('should handle empty arrays', () => {
      persistCustomLots([]);
      const stored = localStorage.getItem('portfolio-custom-lots');
      expect(stored).toBe('[]');
    });
  });

  describe('clearCustomLots', () => {
    it('should remove custom lots from localStorage', () => {
      localStorage.setItem('portfolio-custom-lots', '[]');
      clearCustomLots();
      expect(localStorage.getItem('portfolio-custom-lots')).toBeNull();
    });
  });

  describe('loadSnapshot', () => {
    it('should return fallback when no data exists', () => {
      const fallback: PortfolioSnapshot = {
        asOf: '2025-01-01',
        seedAmount: 10000,
        equities: [],
      };
      const result = loadSnapshot(data => data as PortfolioSnapshot, fallback);
      expect(result).toEqual(fallback);
    });

    it('should load and parse snapshot from localStorage', () => {
      const snapshot: PortfolioSnapshot = {
        asOf: '2025-01-01',
        seedAmount: 10000,
        equities: [],
      };
      localStorage.setItem('portfolio-snapshot', JSON.stringify(snapshot));

      const result = loadSnapshot(data => data as PortfolioSnapshot, {
        asOf: '',
        seedAmount: 0,
        equities: [],
      });
      expect(result).toEqual(snapshot);
    });

    it('should return fallback on parse error', () => {
      localStorage.setItem('portfolio-snapshot', 'invalid json');
      const fallback: PortfolioSnapshot = {
        asOf: '2025-01-01',
        seedAmount: 0,
        equities: [],
      };
      const result = loadSnapshot(data => data as PortfolioSnapshot, fallback);
      expect(result).toEqual(fallback);
    });
  });

  describe('persistSnapshot', () => {
    it('should save snapshot to localStorage', () => {
      const snapshot: PortfolioSnapshot = {
        asOf: '2025-01-01',
        seedAmount: 10000,
        equities: [],
      };
      persistSnapshot(snapshot);

      const stored = localStorage.getItem('portfolio-snapshot');
      expect(stored).toBe(JSON.stringify(snapshot));
    });
  });

  describe('clearSnapshot', () => {
    it('should remove snapshot from localStorage', () => {
      localStorage.setItem('portfolio-snapshot', '{}');
      clearSnapshot();
      expect(localStorage.getItem('portfolio-snapshot')).toBeNull();
    });
  });

  describe('loadSavedPortfolios', () => {
    it('should return empty array when no portfolios exist', () => {
      const result = loadSavedPortfolios();
      expect(result).toEqual([]);
    });

    it('should load portfolios from localStorage', () => {
      const portfolios: SavedPortfolio[] = [
        {
          id: '1',
          name: 'Test Portfolio',
          snapshot: { asOf: '2025-01-01', seedAmount: 10000, equities: [] },
          customLots: [],
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ];
      localStorage.setItem('saved-portfolios', JSON.stringify(portfolios));

      const result = loadSavedPortfolios();
      expect(result).toEqual(portfolios);
    });

    it('should return empty array on parse error', () => {
      localStorage.setItem('saved-portfolios', 'invalid json');
      const result = loadSavedPortfolios();
      expect(result).toEqual([]);
    });

    it('should return empty array if data is not an array', () => {
      localStorage.setItem('saved-portfolios', '{"not": "array"}');
      const result = loadSavedPortfolios();
      expect(result).toEqual([]);
    });
  });

  describe('saveSavedPortfolios', () => {
    it('should save portfolios to localStorage', () => {
      const portfolios: SavedPortfolio[] = [
        {
          id: '1',
          name: 'Test',
          snapshot: { asOf: '2025-01-01', seedAmount: 10000, equities: [] },
          customLots: [],
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      ];
      saveSavedPortfolios(portfolios);

      const stored = localStorage.getItem('saved-portfolios');
      expect(stored).toBe(JSON.stringify(portfolios));
    });
  });

  describe('getActivePortfolioId', () => {
    it('should return null when no active portfolio is set', () => {
      const result = getActivePortfolioId();
      expect(result).toBeNull();
    });

    it('should return active portfolio ID', () => {
      localStorage.setItem('active-portfolio-id', 'portfolio-123');
      const result = getActivePortfolioId();
      expect(result).toBe('portfolio-123');
    });
  });

  describe('setActivePortfolioId', () => {
    it('should set active portfolio ID', () => {
      setActivePortfolioId('portfolio-123');
      const stored = localStorage.getItem('active-portfolio-id');
      expect(stored).toBe('portfolio-123');
    });

    it('should remove active portfolio ID when set to null', () => {
      localStorage.setItem('active-portfolio-id', 'portfolio-123');
      setActivePortfolioId(null);
      expect(localStorage.getItem('active-portfolio-id')).toBeNull();
    });
  });

  describe('savePortfolio', () => {
    it('should create a new portfolio', () => {
      const snapshot: PortfolioSnapshot = {
        asOf: '2025-01-01',
        seedAmount: 10000,
        equities: [],
      };
      const lots: PurchaseLot[] = [];

      const result = savePortfolio('portfolio-1', 'My Portfolio', snapshot, lots);

      expect(result.id).toBe('portfolio-1');
      expect(result.name).toBe('My Portfolio');
      expect(result.snapshot).toEqual(snapshot);
      expect(result.customLots).toEqual(lots);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      const portfolios = loadSavedPortfolios();
      expect(portfolios).toHaveLength(1);
      expect(portfolios[0]).toEqual(result);
    });

    it('should update existing portfolio', async () => {
      const snapshot1: PortfolioSnapshot = {
        asOf: '2025-01-01',
        seedAmount: 10000,
        equities: [],
      };
      const snapshot2: PortfolioSnapshot = {
        asOf: '2025-01-02',
        seedAmount: 20000,
        equities: [],
      };

      const created = savePortfolio('portfolio-1', 'Original', snapshot1, []);

      // Wait a tiny bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = savePortfolio('portfolio-1', 'Updated', snapshot2, []);

      expect(updated.id).toBe('portfolio-1');
      expect(updated.name).toBe('Updated');
      expect(updated.snapshot).toEqual(snapshot2);
      expect(updated.createdAt).toBe(created.createdAt);
      expect(updated.updatedAt).not.toBe(created.updatedAt);

      const portfolios = loadSavedPortfolios();
      expect(portfolios).toHaveLength(1);
    });
  });

  describe('loadPortfolioById', () => {
    it('should return null when portfolio does not exist', () => {
      const result = loadPortfolioById('nonexistent');
      expect(result).toBeNull();
    });

    it('should load portfolio by ID', () => {
      const snapshot: PortfolioSnapshot = {
        asOf: '2025-01-01',
        seedAmount: 10000,
        equities: [],
      };
      const saved = savePortfolio('portfolio-1', 'Test', snapshot, []);

      const result = loadPortfolioById('portfolio-1');
      expect(result).toEqual(saved);
    });
  });

  describe('deletePortfolio', () => {
    it('should return false when portfolio does not exist', () => {
      const result = deletePortfolio('nonexistent');
      expect(result).toBe(false);
    });

    it('should delete portfolio and return true', () => {
      const snapshot: PortfolioSnapshot = {
        asOf: '2025-01-01',
        seedAmount: 10000,
        equities: [],
      };
      savePortfolio('portfolio-1', 'Test', snapshot, []);

      const result = deletePortfolio('portfolio-1');
      expect(result).toBe(true);

      const portfolios = loadSavedPortfolios();
      expect(portfolios).toHaveLength(0);
    });

    it('should clear active portfolio ID if deleted portfolio was active', () => {
      const snapshot: PortfolioSnapshot = {
        asOf: '2025-01-01',
        seedAmount: 10000,
        equities: [],
      };
      savePortfolio('portfolio-1', 'Test', snapshot, []);
      setActivePortfolioId('portfolio-1');

      deletePortfolio('portfolio-1');
      expect(getActivePortfolioId()).toBeNull();
    });
  });

  describe('renamePortfolio', () => {
    it('should return false when portfolio does not exist', () => {
      const result = renamePortfolio('nonexistent', 'New Name');
      expect(result).toBe(false);
    });

    it('should rename portfolio and return true', () => {
      const snapshot: PortfolioSnapshot = {
        asOf: '2025-01-01',
        seedAmount: 10000,
        equities: [],
      };
      savePortfolio('portfolio-1', 'Original Name', snapshot, []);

      const result = renamePortfolio('portfolio-1', 'New Name');
      expect(result).toBe(true);

      const portfolio = loadPortfolioById('portfolio-1');
      expect(portfolio?.name).toBe('New Name');
    });

    it('should update updatedAt timestamp', async () => {
      const snapshot: PortfolioSnapshot = {
        asOf: '2025-01-01',
        seedAmount: 10000,
        equities: [],
      };
      const created = savePortfolio('portfolio-1', 'Original', snapshot, []);

      // Wait a tiny bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      renamePortfolio('portfolio-1', 'Renamed');

      const portfolio = loadPortfolioById('portfolio-1');
      expect(portfolio?.updatedAt).not.toBe(created.updatedAt);
    });
  });

  describe('getPortfolioMetadataList', () => {
    it('should return empty array when no portfolios exist', () => {
      const result = getPortfolioMetadataList();
      expect(result).toEqual([]);
    });

    it('should return metadata for all portfolios', () => {
      const snapshot: PortfolioSnapshot = {
        asOf: '2025-01-01',
        seedAmount: 10000,
        equities: [],
      };
      savePortfolio('portfolio-1', 'Portfolio 1', snapshot, []);
      savePortfolio('portfolio-2', 'Portfolio 2', snapshot, []);

      const result = getPortfolioMetadataList();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('createdAt');
      expect(result[0]).toHaveProperty('updatedAt');
      expect(result[0]).not.toHaveProperty('snapshot');
      expect(result[0]).not.toHaveProperty('customLots');
    });
  });

  describe('loadCustomLots', () => {
    it('should load custom lots with parser', () => {
      const lots: PurchaseLot[] = [
        {
          id: 'lot-1',
          symbol: 'AAPL',
          tradeDate: '2025-01-01',
          shares: 100,
          pricePerShare: 150,
        },
      ];
      localStorage.setItem('portfolio-custom-lots', JSON.stringify(lots));

      const result = loadCustomLots(data => data as PurchaseLot[], []);
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('AAPL');
    });

    it('should return fallback when no data exists', () => {
      const result = loadCustomLots(data => data as PurchaseLot[], []);
      expect(result).toEqual([]);
    });

    it('should return fallback on parse error', () => {
      localStorage.setItem('portfolio-custom-lots', 'invalid json');
      const result = loadCustomLots(data => data as PurchaseLot[], []);
      expect(result).toEqual([]);
    });
  });

  describe('persistCustomLots', () => {
    it('should persist custom lots', () => {
      const lots: PurchaseLot[] = [
        {
          id: 'lot-1',
          symbol: 'AAPL',
          tradeDate: '2025-01-01',
          shares: 100,
          pricePerShare: 150,
        },
      ];
      persistCustomLots(lots);

      const stored = localStorage.getItem('portfolio-custom-lots');
      expect(stored).toBe(JSON.stringify(lots));
    });
  });

  describe('clearCustomLots', () => {
    it('should clear custom lots', () => {
      localStorage.setItem('portfolio-custom-lots', 'some data');
      clearCustomLots();
      expect(localStorage.getItem('portfolio-custom-lots')).toBeNull();
    });
  });

  describe('loadSnapshot', () => {
    it('should load snapshot with parser', () => {
      const snapshot: PortfolioSnapshot = {
        asOf: '2025-01-01',
        seedAmount: 10000,
        equities: [],
      };
      localStorage.setItem('portfolio-snapshot', JSON.stringify(snapshot));

      const result = loadSnapshot(data => data as PortfolioSnapshot, {
        asOf: '',
        seedAmount: 0,
        equities: [],
      });
      expect(result.asOf).toBe('2025-01-01');
    });

    it('should return fallback when no data exists', () => {
      const fallback: PortfolioSnapshot = { asOf: '', seedAmount: 0, equities: [] };
      const result = loadSnapshot(data => data as PortfolioSnapshot, fallback);
      expect(result).toEqual(fallback);
    });

    it('should return fallback on parse error', () => {
      localStorage.setItem('portfolio-snapshot', 'invalid json');
      const fallback: PortfolioSnapshot = { asOf: '', seedAmount: 0, equities: [] };
      const result = loadSnapshot(data => data as PortfolioSnapshot, fallback);
      expect(result).toEqual(fallback);
    });
  });

  describe('persistSnapshot', () => {
    it('should persist snapshot', () => {
      const snapshot: PortfolioSnapshot = {
        asOf: '2025-01-01',
        seedAmount: 10000,
        equities: [],
      };
      persistSnapshot(snapshot);

      const stored = localStorage.getItem('portfolio-snapshot');
      expect(stored).toBe(JSON.stringify(snapshot));
    });
  });

  describe('clearSnapshot', () => {
    it('should clear snapshot', () => {
      localStorage.setItem('portfolio-snapshot', 'some data');
      clearSnapshot();
      expect(localStorage.getItem('portfolio-snapshot')).toBeNull();
    });
  });
});

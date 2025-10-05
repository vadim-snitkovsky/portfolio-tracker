import { describe, it, expect } from 'vitest';
import { parsePortfolioSnapshot, readSnapshotFile } from './portfolioImport';
import type { PortfolioSnapshot } from '../types/portfolio';

describe('portfolioImport', () => {
  describe('parsePortfolioSnapshot', () => {
    it('should parse valid snapshot', () => {
      const raw = {
        asOf: '2025-01-15',
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

      const result = parsePortfolioSnapshot(raw);
      expect(result.asOf).toBe('2025-01-15');
      expect(result.equities).toHaveLength(1);
      expect(result.equities[0].symbol).toBe('AAPL');
    });

    it('should parse snapshot with cash position', () => {
      const raw = {
        asOf: '2025-01-15',
        equities: [],
        cashPosition: 5000
      };

      const result = parsePortfolioSnapshot(raw);
      expect(result.cashPosition).toBe(5000);
    });

    it('should throw error if not an object', () => {
      expect(() => parsePortfolioSnapshot(null)).toThrow('Snapshot must be an object');
      expect(() => parsePortfolioSnapshot('string')).toThrow('Snapshot must be an object');
      expect(() => parsePortfolioSnapshot(123)).toThrow('Snapshot must be an object');
    });

    it('should throw error if asOf is missing', () => {
      const raw = {
        equities: []
      };
      expect(() => parsePortfolioSnapshot(raw)).toThrow('Snapshot requires an "asOf" ISO date string');
    });

    it('should throw error if equities is not an array', () => {
      const raw = {
        asOf: '2025-01-15',
        equities: 'not an array'
      };
      expect(() => parsePortfolioSnapshot(raw)).toThrow('Snapshot requires an array of equities');
    });

    it('should throw error if equity has invalid fields', () => {
      const raw = {
        asOf: '2025-01-15',
        equities: [
          {
            symbol: 'AAPL',
            // missing required fields
          }
        ]
      };
      expect(() => parsePortfolioSnapshot(raw)).toThrow('One or more equities contain invalid fields');
    });

    it('should parse dividends correctly', () => {
      const raw = {
        asOf: '2025-01-15',
        equities: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            sector: 'Technology',
            shares: 100,
            averageCost: 150,
            currentPrice: 180,
            dividends: [
              { id: '1', date: '2025-01-01', amountPerShare: 0.25 },
              { id: '2', date: '2025-01-02', amount: 0.30 } // legacy 'amount' field
            ],
            navHistory: []
          }
        ]
      };

      const result = parsePortfolioSnapshot(raw);
      expect(result.equities[0].dividends).toHaveLength(2);
      expect(result.equities[0].dividends[0].amountPerShare).toBe(0.25);
      expect(result.equities[0].dividends[1].amountPerShare).toBe(0.30);
    });

    it('should filter out invalid dividends', () => {
      const raw = {
        asOf: '2025-01-15',
        equities: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            sector: 'Technology',
            shares: 100,
            averageCost: 150,
            currentPrice: 180,
            dividends: [
              { id: '1', date: '2025-01-01', amountPerShare: 0.25 },
              { id: '2', date: '2025-01-02' }, // missing amountPerShare
              { invalid: 'dividend' }
            ],
            navHistory: []
          }
        ]
      };

      const result = parsePortfolioSnapshot(raw);
      expect(result.equities[0].dividends).toHaveLength(1);
    });

    it('should parse navHistory correctly', () => {
      const raw = {
        asOf: '2025-01-15',
        equities: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            sector: 'Technology',
            shares: 100,
            averageCost: 150,
            currentPrice: 180,
            dividends: [],
            navHistory: [
              { date: '2024-12-01', value: 170 },
              { date: '2025-01-01', value: 180 }
            ]
          }
        ]
      };

      const result = parsePortfolioSnapshot(raw);
      expect(result.equities[0].navHistory).toHaveLength(2);
      expect(result.equities[0].navHistory[0].value).toBe(170);
    });

    it('should filter out invalid navHistory entries', () => {
      const raw = {
        asOf: '2025-01-15',
        equities: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            sector: 'Technology',
            shares: 100,
            averageCost: 150,
            currentPrice: 180,
            dividends: [],
            navHistory: [
              { date: '2024-12-01', value: 170 },
              { date: '2025-01-01' }, // missing value
              { invalid: 'nav' }
            ]
          }
        ]
      };

      const result = parsePortfolioSnapshot(raw);
      expect(result.equities[0].navHistory).toHaveLength(1);
    });

    it('should handle empty dividends and navHistory arrays', () => {
      const raw = {
        asOf: '2025-01-15',
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

      const result = parsePortfolioSnapshot(raw);
      expect(result.equities[0].dividends).toEqual([]);
      expect(result.equities[0].navHistory).toEqual([]);
    });

    it('should handle missing dividends and navHistory fields', () => {
      const raw = {
        asOf: '2025-01-15',
        equities: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            sector: 'Technology',
            shares: 100,
            averageCost: 150,
            currentPrice: 180
          }
        ]
      };

      const result = parsePortfolioSnapshot(raw);
      expect(result.equities[0].dividends).toEqual([]);
      expect(result.equities[0].navHistory).toEqual([]);
    });

    it('should parse snapshot with cashPosition', () => {
      const raw = {
        asOf: '2025-01-15',
        cashPosition: 5000,
        equities: []
      };

      const result = parsePortfolioSnapshot(raw);
      expect(result.cashPosition).toBe(5000);
    });

    it('should parse snapshot without cashPosition', () => {
      const raw = {
        asOf: '2025-01-15',
        equities: []
      };

      const result = parsePortfolioSnapshot(raw);
      expect(result.cashPosition).toBeUndefined();
    });

    it('should ignore invalid cashPosition type', () => {
      const raw = {
        asOf: '2025-01-15',
        cashPosition: 'invalid',
        equities: []
      };

      const result = parsePortfolioSnapshot(raw);
      expect(result.cashPosition).toBeUndefined();
    });
  });

  describe('readSnapshotFile', () => {
    it('should read and parse a valid snapshot file', async () => {
      const snapshot: PortfolioSnapshot = {
        asOf: '2025-01-15',
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

      const fileContent = JSON.stringify(snapshot);
      const blob = new Blob([fileContent], { type: 'application/json' });
      const file = new File([blob], 'portfolio.json', { type: 'application/json' });

      // Mock the text() method
      file.text = async () => fileContent;

      const result = await readSnapshotFile(file);
      expect(result.snapshot.asOf).toBe('2025-01-15');
      expect(result.snapshot.equities).toHaveLength(1);
      expect(result.customLots).toEqual([]);
    });

    it('should read file with snapshot and customLots', async () => {
      const data = {
        snapshot: {
          asOf: '2025-01-15',
          equities: []
        },
        customLots: [
          {
            id: '1',
            symbol: 'AAPL',
            tradeDate: '2025-01-01',
            shares: 10,
            pricePerShare: 150
          }
        ]
      };

      const fileContent = JSON.stringify(data);
      const blob = new Blob([fileContent], { type: 'application/json' });
      const file = new File([blob], 'portfolio.json', { type: 'application/json' });
      file.text = async () => fileContent;

      const result = await readSnapshotFile(file);
      expect(result.snapshot.asOf).toBe('2025-01-15');
      expect(result.customLots).toHaveLength(1);
      expect(result.customLots[0].symbol).toBe('AAPL');
    });

    it('should filter out invalid custom lots', async () => {
      const data = {
        snapshot: {
          asOf: '2025-01-15',
          equities: []
        },
        customLots: [
          {
            id: '1',
            symbol: 'AAPL',
            tradeDate: '2025-01-01',
            shares: 10,
            pricePerShare: 150
          },
          {
            id: '2',
            symbol: 'MSFT'
            // missing required fields
          }
        ]
      };

      const fileContent = JSON.stringify(data);
      const blob = new Blob([fileContent], { type: 'application/json' });
      const file = new File([blob], 'portfolio.json', { type: 'application/json' });
      file.text = async () => fileContent;

      const result = await readSnapshotFile(file);
      expect(result.customLots).toHaveLength(1);
    });

    it('should throw error for invalid JSON', async () => {
      const blob = new Blob(['not valid json'], { type: 'application/json' });
      const file = new File([blob], 'portfolio.json', { type: 'application/json' });
      file.text = async () => 'not valid json';

      await expect(readSnapshotFile(file)).rejects.toThrow('File is not valid JSON');
    });

    it('should throw error for invalid snapshot structure', async () => {
      const fileContent = JSON.stringify({ invalid: 'data' });
      const blob = new Blob([fileContent], { type: 'application/json' });
      const file = new File([blob], 'portfolio.json', { type: 'application/json' });
      file.text = async () => fileContent;

      await expect(readSnapshotFile(file)).rejects.toThrow();
    });
  });
});


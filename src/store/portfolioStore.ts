import { create } from 'zustand';
import { samplePortfolio, samplePurchaseLots } from '../data/samplePortfolio';
import type {
  DividendPayment,
  DividendPaymentWithShares,
  EquityPosition,
  PortfolioSnapshot,
  PurchaseLot,
  SavedPortfolio,
  PortfolioMetadata
} from '../types/portfolio';
import {
  loadCustomLots,
  persistCustomLots,
  loadSnapshot,
  persistSnapshot,
  savePortfolio,
  loadPortfolioById,
  deletePortfolio,
  renamePortfolio,
  getPortfolioMetadataList,
  getActivePortfolioId,
  setActivePortfolioId
} from '../utils/storage';
import {
  fetchQuotes,
  mergeQuotesIntoPositions,
  fetchDividends,
  mergeDividendsIntoPositions,
  type QuoteResult,
  type DividendResult
} from '../services/marketData';


const isPurchaseLot = (value: unknown): value is PurchaseLot => {
  if (!value || typeof value !== 'object') return false;
  const lot = value as Record<string, unknown>;
  return (
    typeof lot.id === 'string' &&
    typeof lot.symbol === 'string' &&
    typeof lot.tradeDate === 'string' &&
    typeof lot.shares === 'number' &&
    typeof lot.pricePerShare === 'number'
  );
};

const createSeedLotsFromSnapshot = (snapshot: PortfolioSnapshot): PurchaseLot[] =>
  snapshot.equities
    .filter((equity) => equity.shares > 0)
    .map((equity, index) => ({
      id: `seed-${equity.symbol}-${index}`,
      symbol: equity.symbol,
      tradeDate: snapshot.asOf,
      shares: equity.shares,
      pricePerShare: equity.averageCost
    }));

const sanitizeSnapshotEquities = (snapshot: PortfolioSnapshot): PortfolioSnapshot => ({
  ...snapshot,
  equities: snapshot.equities.map((equity) => ({
    ...equity,
    shares: 0
  }))
});

const mergeSeedLots = (existing: PurchaseLot[], seeds: PurchaseLot[]): PurchaseLot[] => {
  const existingSymbols = new Set(existing.map((lot) => lot.symbol.toUpperCase()));
  const missingSeeds = seeds.filter((seed) => !existingSymbols.has(seed.symbol.toUpperCase()));
  return [...existing, ...missingSeeds];
};

const parseStoredLots = (data: unknown): PurchaseLot[] => {
  if (!Array.isArray(data)) return [];
  return data.filter(isPurchaseLot);
};
export interface EquityMetrics {
  position: EquityPosition;
  costBasis: number;
  marketValue: number;
  totalDividends: number;
  totalReturn: number;
  roi: number;
  dividendYieldOnCost: number;
  navPeak: number;
  navDecayPercent: number;
}

export interface PortfolioMetrics {
  totalCostBasis: number;
  totalMarketValue: number;
  totalDividends: number;
  totalReturn: number;
  roi: number;
  incomeYieldOnCost: number;
}

interface PortfolioState {
  snapshot: PortfolioSnapshot;
  customLots: PurchaseLot[];
  activePortfolioId: string | null;
  activePortfolioName: string | null;
  setSnapshot: (snapshot: PortfolioSnapshot) => void;
  addPurchaseLot: (lot: PurchaseLot) => void;
  updatePurchaseLot: (id: string, updates: Partial<Omit<PurchaseLot, 'id'>>) => void;
  removePurchaseLot: (id: string) => void;
  removeDividend: (symbol: string, dividendId: string) => void;
  loadPortfolio: (snapshot: PortfolioSnapshot, customLots: PurchaseLot[]) => void;
  quoteStatus: {
    isLoading: boolean;
    lastUpdated?: string;
    error?: string;
  };
  dividendStatus: {
    isLoading: boolean;
    lastUpdated?: string;
    error?: string;
  };
  refreshQuotes: () => Promise<QuoteResult[]>;
  refreshDividends: (monthsBack?: number) => Promise<DividendResult[]>;
  // Multi-portfolio management
  saveCurrentPortfolio: (name: string) => SavedPortfolio;
  loadSavedPortfolio: (id: string) => boolean;
  deleteSavedPortfolio: (id: string) => boolean;
  renameSavedPortfolio: (id: string, newName: string) => boolean;
  getSavedPortfolios: () => PortfolioMetadata[];
  createNewPortfolio: (name: string) => void;
}

const sumDividends = (dividends: DividendPayment[], shares: number): number =>
  dividends.reduce((acc, payout) => acc + payout.amountPerShare * shares, 0);

export const calculateEquityMetrics = (equity: EquityPosition): EquityMetrics => {
  const costBasis = equity.shares * equity.averageCost;
  const marketValue = equity.shares * equity.currentPrice;
  const totalDividends = sumDividends(equity.dividends, equity.shares);
  const totalReturn = marketValue + totalDividends - costBasis;
  const roi = costBasis === 0 ? 0 : (totalReturn / costBasis) * 100;
  const dividendYieldOnCost = costBasis === 0 ? 0 : (totalDividends / costBasis) * 100;
  const navPeak = equity.navHistory.reduce(
    (peak, point) => (point.value > peak ? point.value : peak),
    equity.navHistory[0]?.value ?? equity.currentPrice
  );
  const latestNav = equity.navHistory[equity.navHistory.length - 1]?.value ?? equity.currentPrice;
  const navDecayPercent = navPeak === 0 ? 0 : ((navPeak - latestNav) / navPeak) * 100;

  return {
    position: equity,
    costBasis,
    marketValue,
    totalDividends,
    totalReturn,
    roi,
    dividendYieldOnCost,
    navPeak,
    navDecayPercent
  };
};

export const calculatePortfolioMetrics = (equities: EquityPosition[]): PortfolioMetrics => {
  const base = equities.reduce(
    (acc, equity) => {
      const metrics = calculateEquityMetrics(equity);
      acc.totalCostBasis += metrics.costBasis;
      acc.totalMarketValue += metrics.marketValue;
      acc.totalDividends += metrics.totalDividends;
      acc.totalReturn += metrics.totalReturn;
      return acc;
    },
    {
      totalCostBasis: 0,
      totalMarketValue: 0,
      totalDividends: 0,
      totalReturn: 0
    }
  );

  const roi = base.totalCostBasis === 0 ? 0 : (base.totalReturn / base.totalCostBasis) * 100;
  const incomeYieldOnCost =
    base.totalCostBasis === 0 ? 0 : (base.totalDividends / base.totalCostBasis) * 100;

  return {
    ...base,
    roi,
    incomeYieldOnCost
  };
};


const isPortfolioSnapshot = (value: unknown): value is PortfolioSnapshot => {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.asOf === 'string' &&
    Array.isArray(obj.equities)
  );
};

const parseStoredSnapshot = (data: unknown): PortfolioSnapshot | null => {
  if (!isPortfolioSnapshot(data)) return null;
  return data;
};

const sanitizedSamplePortfolio = sanitizeSnapshotEquities(samplePortfolio);
const storedLots = loadCustomLots(parseStoredLots, []);
const storedSnapshot = loadSnapshot(parseStoredSnapshot, null);

// Use stored snapshot if available, otherwise use sample
const initialSnapshot = storedSnapshot ? sanitizeSnapshotEquities(storedSnapshot) : sanitizedSamplePortfolio;

// Use sample purchase lots with realistic acquisition dates instead of creating seed lots
const initialCustomLots = storedLots.length > 0 ? storedLots : samplePurchaseLots;
if (typeof window !== 'undefined') {
  if (storedLots.length === 0 && samplePurchaseLots.length > 0) {
    persistCustomLots(initialCustomLots);
  }
  if (!storedSnapshot) {
    persistSnapshot(initialSnapshot);
  }
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  snapshot: initialSnapshot,
  customLots: initialCustomLots,
  activePortfolioId: getActivePortfolioId(),
  activePortfolioName: null,
  setSnapshot: (snapshot) => {
    const sanitized = sanitizeSnapshotEquities(snapshot);
    persistSnapshot(sanitized);
    set({ snapshot: sanitized });
  },
  loadPortfolio: (snapshot, customLots) =>
    set(() => {
      const sanitized = sanitizeSnapshotEquities(snapshot);
      const seed = createSeedLotsFromSnapshot(snapshot);
      const normalized = mergeSeedLots(customLots.filter(isPurchaseLot), seed);
      persistCustomLots(normalized);
      return { snapshot: sanitized, customLots: normalized };
    }),
  addPurchaseLot: (lot) =>
    set((state) => {
      const updatedLots = [...state.customLots, lot];
      persistCustomLots(updatedLots);
      return { customLots: updatedLots };
    }),
  updatePurchaseLot: (id, updates) =>
    set((state) => {
      const updatedLots = state.customLots.map((lot) =>
        lot.id === id ? { ...lot, ...updates } : lot
      );
      persistCustomLots(updatedLots);
      return { customLots: updatedLots };
    }),
  removePurchaseLot: (id) =>
    set((state) => {
      const updatedLots = state.customLots.filter((lot) => lot.id !== id);
      persistCustomLots(updatedLots);

      // Clean up equities with 0 shares from snapshot
      // Get symbols that still have lots
      const symbolsWithLots = new Set(updatedLots.map(lot => lot.symbol.toUpperCase()));

      // Remove equities that have 0 shares in snapshot AND no lots
      const cleanedEquities = state.snapshot.equities.filter(equity => {
        const hasLotsForSymbol = symbolsWithLots.has(equity.symbol.toUpperCase());
        const hasSnapshotShares = equity.shares > 0;
        // Keep equity if it has snapshot shares OR has lots
        return hasSnapshotShares || hasLotsForSymbol;
      });

      const updatedSnapshot = {
        ...state.snapshot,
        equities: cleanedEquities
      };

      persistSnapshot(updatedSnapshot);

      return {
        customLots: updatedLots,
        snapshot: updatedSnapshot
      };
    }),
  removeDividend: (symbol, dividendId) =>
    set((state) => {
      const updatedEquities = state.snapshot.equities.map((equity) => {
        if (equity.symbol.toUpperCase() === symbol.toUpperCase()) {
          return {
            ...equity,
            dividends: equity.dividends.filter((div) => div.id !== dividendId)
          };
        }
        return equity;
      });

      const updatedSnapshot = {
        ...state.snapshot,
        equities: updatedEquities
      };

      persistSnapshot(updatedSnapshot);

      return {
        snapshot: updatedSnapshot
      };
    }),
  quoteStatus: {
    isLoading: false
  },
  dividendStatus: {
    isLoading: false
  },
  refreshQuotes: async () => {
    const { snapshot, customLots } = get();

    // Get symbols from both snapshot equities AND custom lots
    const snapshotSymbols = snapshot.equities.map((equity) => equity.symbol);
    const lotSymbols = customLots.map((lot) => lot.symbol);
    const allSymbols = [...new Set([...snapshotSymbols, ...lotSymbols])].filter(Boolean);

    if (allSymbols.length === 0) {
      return [];
    }

    set((state) => ({
      quoteStatus: {
        ...state.quoteStatus,
        isLoading: true,
        error: undefined
      }
    }));

    const quotes = await fetchQuotes(allSymbols);

    // First, merge quotes into existing equities
    let mergedEquities = mergeQuotesIntoPositions(snapshot.equities, quotes);

    // Then, add new equities for symbols that only exist in lots
    const existingSymbols = new Set(mergedEquities.map(e => e.symbol.toUpperCase()));
    const newEquities: EquityPosition[] = [];

    quotes.forEach(quote => {
      if (!existingSymbols.has(quote.symbol.toUpperCase()) && quote.regularMarketPrice) {
        // Find lots for this symbol to get average cost
        const lotsForSymbol = customLots.filter(lot => lot.symbol.toUpperCase() === quote.symbol.toUpperCase());
        const { totalShares, totalCost } = aggregateLots(lotsForSymbol);
        const averageCost = totalShares > 0 ? totalCost / totalShares : quote.regularMarketPrice;

        newEquities.push({
          symbol: quote.symbol,
          name: quote.symbol, // Will be updated when we fetch more data
          sector: 'Manual Entry',
          shares: 0, // Shares tracked in lots
          averageCost,
          currentPrice: quote.regularMarketPrice,
          dividends: [],
          navHistory: quote.navHistory || []
        });
      }
    });

    mergedEquities = [...mergedEquities, ...newEquities];

    const erroredSymbols = quotes.filter((quote) => quote.error);
    const errorMessage =
      erroredSymbols.length > 0
        ? `Failed to refresh: ${erroredSymbols
            .map((quote) => `${quote.symbol}${quote.error ? ` (${quote.error})` : ''}`)
            .join(', ')}`
        : undefined;

    const now = new Date().toISOString();
    const updatedSnapshot = {
      ...snapshot,
      equities: mergedEquities,
      lastPriceUpdate: now
    };

    persistSnapshot(updatedSnapshot);

    set({
      snapshot: updatedSnapshot,
      quoteStatus: {
        isLoading: false,
        lastUpdated: now,
        error: errorMessage
      }
    });

    return quotes;
  },
  refreshDividends: async (monthsBack = 12) => {
    const { snapshot, customLots } = get();

    // Get symbols from both snapshot equities AND custom lots
    const snapshotSymbols = snapshot.equities.map((equity) => equity.symbol);
    const lotSymbols = customLots.map((lot) => lot.symbol);
    const allSymbols = [...new Set([...snapshotSymbols, ...lotSymbols])].filter(Boolean);

    if (allSymbols.length === 0) {
      return [];
    }

    set((state) => ({
      dividendStatus: {
        ...state.dividendStatus,
        isLoading: true,
        error: undefined
      }
    }));

    const dividendResults = await fetchDividends(allSymbols, monthsBack);

    // First, merge dividends into existing equities
    let mergedEquities = mergeDividendsIntoPositions(snapshot.equities, dividendResults);

    // Then, add new equities for symbols that only exist in lots
    const existingSymbols = new Set(mergedEquities.map(e => e.symbol.toUpperCase()));
    const newEquities: EquityPosition[] = [];

    dividendResults.forEach(result => {
      if (!existingSymbols.has(result.symbol.toUpperCase()) && result.dividends.length > 0) {
        // Find lots for this symbol to get average cost
        const lotsForSymbol = customLots.filter(lot => lot.symbol.toUpperCase() === result.symbol.toUpperCase());
        const { totalShares, totalCost } = aggregateLots(lotsForSymbol);
        const averageCost = totalShares > 0 ? totalCost / totalShares : 0;

        newEquities.push({
          symbol: result.symbol,
          name: result.symbol, // Will be updated when we fetch more data
          sector: 'Manual Entry',
          shares: 0, // Shares tracked in lots
          averageCost,
          currentPrice: averageCost, // Use average cost as placeholder
          dividends: result.dividends,
          navHistory: []
        });
      }
    });

    mergedEquities = [...mergedEquities, ...newEquities];

    const erroredSymbols = dividendResults.filter((result) => result.error);
    const errorMessage =
      erroredSymbols.length > 0
        ? `Failed to refresh dividends: ${erroredSymbols
            .map((result) => `${result.symbol}${result.error ? ` (${result.error})` : ''}`)
            .join(', ')}`
        : undefined;

    const now = new Date().toISOString();
    const updatedSnapshot = {
      ...snapshot,
      equities: mergedEquities,
      lastDividendUpdate: now
    };

    persistSnapshot(updatedSnapshot);

    set({
      snapshot: updatedSnapshot,
      dividendStatus: {
        isLoading: false,
        lastUpdated: now,
        error: errorMessage
      }
    });

    return dividendResults;
  },

  // Multi-portfolio management
  saveCurrentPortfolio: (name: string) => {
    const state = get();
    const id = state.activePortfolioId || `portfolio-${Date.now()}`;

    const saved = savePortfolio(id, name, state.snapshot, state.customLots);
    setActivePortfolioId(id);

    set({
      activePortfolioId: id,
      activePortfolioName: name
    });

    return saved;
  },

  loadSavedPortfolio: (id: string) => {
    const portfolio = loadPortfolioById(id);

    if (!portfolio) {
      return false;
    }

    const sanitized = sanitizeSnapshotEquities(portfolio.snapshot);
    persistSnapshot(sanitized);
    persistCustomLots(portfolio.customLots);
    setActivePortfolioId(id);

    set({
      snapshot: sanitized,
      customLots: portfolio.customLots,
      activePortfolioId: id,
      activePortfolioName: portfolio.name
    });

    return true;
  },

  deleteSavedPortfolio: (id: string) => {
    const success = deletePortfolio(id);

    if (success && get().activePortfolioId === id) {
      set({
        activePortfolioId: null,
        activePortfolioName: null
      });
    }

    return success;
  },

  renameSavedPortfolio: (id: string, newName: string) => {
    const success = renamePortfolio(id, newName);

    // If the renamed portfolio is the active one, update the active name
    if (success && get().activePortfolioId === id) {
      set({
        activePortfolioName: newName
      });
    }

    return success;
  },

  getSavedPortfolios: () => {
    return getPortfolioMetadataList();
  },

  createNewPortfolio: (name: string) => {
    const id = `portfolio-${Date.now()}`;
    const newSnapshot = sanitizeSnapshotEquities(samplePortfolio);
    const newLots: PurchaseLot[] = [];

    persistSnapshot(newSnapshot);
    persistCustomLots(newLots);
    setActivePortfolioId(id);

    set({
      snapshot: newSnapshot,
      customLots: newLots,
      activePortfolioId: id,
      activePortfolioName: name
    });

    // Save the new portfolio
    savePortfolio(id, name, newSnapshot, newLots);
  }
}));

const groupLotsBySymbol = (lots: PurchaseLot[]): Map<string, PurchaseLot[]> => {
  return lots.reduce((map, lot) => {
    const symbol = lot.symbol.toUpperCase();
    const existing = map.get(symbol) ?? [];
    existing.push({ ...lot, symbol });
    map.set(symbol, existing);
    return map;
  }, new Map<string, PurchaseLot[]>());
};

const aggregateLots = (lots: PurchaseLot[]) => {
  return lots.reduce(
    (acc, lot) => {
      acc.totalShares += lot.shares;
      acc.totalCost += lot.shares * lot.pricePerShare;
      return acc;
    },
    { totalShares: 0, totalCost: 0 }
  );
};

export interface EquityWithLots {
  position: EquityPosition;
  manualLots: PurchaseLot[];
  manualTotalShares: number;
  manualTotalCost: number;
  earliestAcquisitionDate?: string;
  dividendsWithShares: DividendPaymentWithShares[]; // Dividends with shares owned at payment date
}

const getEarliestAcquisitionDate = (lots: PurchaseLot[]): string | undefined => {
  if (lots.length === 0) return undefined;
  return lots.reduce((earliest, lot) => {
    return !earliest || lot.tradeDate < earliest ? lot.tradeDate : earliest;
  }, lots[0].tradeDate);
};

const filterDividendsByAcquisitionDate = (
  dividends: DividendPayment[],
  acquisitionDate: string | undefined
): DividendPayment[] => {
  if (!acquisitionDate) return dividends;
  return dividends.filter((dividend) => dividend.date >= acquisitionDate);
};

/**
 * Calculate the number of shares owned at a specific date based on purchase lots.
 * Only counts lots purchased on or before the given date.
 */
const calculateSharesAtDate = (lots: PurchaseLot[], date: string): number => {
  return lots
    .filter((lot) => lot.tradeDate <= date)
    .reduce((total, lot) => total + lot.shares, 0);
};

export const deriveEquityViews = (
  snapshot: PortfolioSnapshot,
  customLots: PurchaseLot[]
): EquityWithLots[] => {
  const lotsBySymbol = groupLotsBySymbol(customLots);
  const views: EquityWithLots[] = [];

  snapshot.equities.forEach((equity) => {
    const lots = lotsBySymbol.get(equity.symbol) ?? [];
    const { totalShares, totalCost } = aggregateLots(lots);
    const earliestAcquisitionDate = getEarliestAcquisitionDate(lots);

    // Filter dividends to only include those on or after the earliest acquisition date
    const filteredDividends = filterDividendsByAcquisitionDate(
      equity.dividends,
      earliestAcquisitionDate
    );

    // Calculate shares owned at each dividend payment date
    const dividendsWithShares: DividendPaymentWithShares[] = filteredDividends.map((dividend) => {
      const sharesFromLots = calculateSharesAtDate(lots, dividend.date);
      const sharesOwned = equity.shares + sharesFromLots;
      return {
        ...dividend,
        sharesOwned
      };
    });

    let combinedPosition = equity;

    if (totalShares > 0) {
      const baseCost = equity.shares * equity.averageCost;
      const combinedShares = equity.shares + totalShares;
      const combinedCost = baseCost + totalCost;
      combinedPosition = {
        ...equity,
        shares: combinedShares,
        averageCost: combinedShares === 0 ? equity.averageCost : combinedCost / combinedShares,
        dividends: filteredDividends
      };
    } else {
      combinedPosition = {
        ...equity,
        dividends: filteredDividends
      };
    }

    views.push({
      position: combinedPosition,
      manualLots: lots,
      manualTotalShares: totalShares,
      manualTotalCost: totalCost,
      earliestAcquisitionDate,
      dividendsWithShares
    });

    lotsBySymbol.delete(equity.symbol);
  });

  lotsBySymbol.forEach((lots, symbol) => {
    const { totalShares, totalCost } = aggregateLots(lots);
    const averageCost = totalShares === 0 ? 0 : totalCost / totalShares;
    const earliestAcquisitionDate = getEarliestAcquisitionDate(lots);

    const position: EquityPosition = {
      symbol,
      name: symbol,
      sector: 'Manual Entry',
      shares: totalShares,
      averageCost,
      currentPrice: lots[lots.length - 1]?.pricePerShare ?? averageCost,
      dividends: [],
      navHistory: []
    };

    // No dividends for lot-only symbols (they'll be added when dividends are refreshed)
    const dividendsWithShares: DividendPaymentWithShares[] = [];

    views.push({
      position,
      manualLots: lots,
      manualTotalShares: totalShares,
      manualTotalCost: totalCost,
      earliestAcquisitionDate,
      dividendsWithShares
    });
  });

  return views.sort((a, b) => a.position.symbol.localeCompare(b.position.symbol));
};

export const selectEquityViews = (state: PortfolioState): EquityWithLots[] =>
  deriveEquityViews(state.snapshot, state.customLots);

export const selectMergedEquities = (state: PortfolioState): EquityPosition[] =>
  selectEquityViews(state).map((view) => view.position);

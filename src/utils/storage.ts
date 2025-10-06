import type {
  SavedPortfolio,
  PortfolioMetadata,
  PortfolioSnapshot,
  PurchaseLot,
} from '../types/portfolio';

const STORAGE_KEY_LOTS = 'portfolio-custom-lots';
const STORAGE_KEY_SNAPSHOT = 'portfolio-snapshot';
const STORAGE_KEY_PORTFOLIOS = 'saved-portfolios';
const STORAGE_KEY_ACTIVE_PORTFOLIO = 'active-portfolio-id';

export const loadCustomLots = <T>(parser: (data: unknown) => T, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_LOTS);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parser(parsed);
  } catch (error) {
    console.warn('Failed to load custom lots from storage', error);
    return fallback;
  }
};

export const persistCustomLots = <T>(value: T) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY_LOTS, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to persist custom lots', error);
  }
};

export const clearCustomLots = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY_LOTS);
};

export const loadSnapshot = <T>(parser: (data: unknown) => T, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_SNAPSHOT);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parser(parsed);
  } catch (error) {
    console.warn('Failed to load snapshot from storage', error);
    return fallback;
  }
};

export const persistSnapshot = <T>(value: T) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY_SNAPSHOT, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to persist snapshot', error);
  }
};

export const clearSnapshot = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY_SNAPSHOT);
};

// Multi-portfolio management functions

export const loadSavedPortfolios = (): SavedPortfolio[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PORTFOLIOS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to load saved portfolios', error);
    return [];
  }
};

export const saveSavedPortfolios = (portfolios: SavedPortfolio[]) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY_PORTFOLIOS, JSON.stringify(portfolios));
  } catch (error) {
    console.warn('Failed to save portfolios', error);
  }
};

export const getActivePortfolioId = (): string | null => {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage.getItem(STORAGE_KEY_ACTIVE_PORTFOLIO);
  } catch (error) {
    console.warn('Failed to get active portfolio ID', error);
    return null;
  }
};

export const setActivePortfolioId = (id: string | null) => {
  if (typeof window === 'undefined') return;

  try {
    if (id === null) {
      window.localStorage.removeItem(STORAGE_KEY_ACTIVE_PORTFOLIO);
    } else {
      window.localStorage.setItem(STORAGE_KEY_ACTIVE_PORTFOLIO, id);
    }
  } catch (error) {
    console.warn('Failed to set active portfolio ID', error);
  }
};

export const savePortfolio = (
  id: string,
  name: string,
  snapshot: PortfolioSnapshot,
  customLots: PurchaseLot[]
): SavedPortfolio => {
  const portfolios = loadSavedPortfolios();
  const now = new Date().toISOString();

  const existingIndex = portfolios.findIndex(p => p.id === id);

  const savedPortfolio: SavedPortfolio = {
    id,
    name,
    snapshot,
    customLots,
    createdAt: existingIndex >= 0 ? portfolios[existingIndex].createdAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    portfolios[existingIndex] = savedPortfolio;
  } else {
    portfolios.push(savedPortfolio);
  }

  saveSavedPortfolios(portfolios);
  return savedPortfolio;
};

export const loadPortfolioById = (id: string): SavedPortfolio | null => {
  const portfolios = loadSavedPortfolios();
  return portfolios.find(p => p.id === id) || null;
};

export const deletePortfolio = (id: string): boolean => {
  const portfolios = loadSavedPortfolios();
  const filtered = portfolios.filter(p => p.id !== id);

  if (filtered.length === portfolios.length) {
    return false; // Portfolio not found
  }

  saveSavedPortfolios(filtered);

  // Clear active portfolio if it was deleted
  if (getActivePortfolioId() === id) {
    setActivePortfolioId(null);
  }

  return true;
};

export const renamePortfolio = (id: string, newName: string): boolean => {
  const portfolios = loadSavedPortfolios();
  const portfolioIndex = portfolios.findIndex(p => p.id === id);

  if (portfolioIndex === -1) {
    return false; // Portfolio not found
  }

  const now = new Date().toISOString();
  portfolios[portfolioIndex] = {
    ...portfolios[portfolioIndex],
    name: newName,
    updatedAt: now,
  };

  saveSavedPortfolios(portfolios);
  return true;
};

export const getPortfolioMetadataList = (): PortfolioMetadata[] => {
  const portfolios = loadSavedPortfolios();
  return portfolios.map(p => ({
    id: p.id,
    name: p.name,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
};

import type {
  DividendPayment,
  EquityPosition,
  NavPoint,
  PortfolioSnapshot,
  PurchaseLot,
} from '../types/portfolio';

const normalizeDividendPayment = (value: unknown): DividendPayment | null => {
  if (!value || typeof value !== 'object') return null;
  const payment = value as Record<string, unknown>;
  const amountPerShare =
    typeof payment.amountPerShare === 'number'
      ? payment.amountPerShare
      : typeof payment.amount === 'number'
        ? payment.amount
        : undefined;

  if (
    typeof payment.id === 'string' &&
    typeof payment.date === 'string' &&
    typeof amountPerShare === 'number'
  ) {
    return {
      id: payment.id,
      date: payment.date,
      amountPerShare,
    };
  }

  return null;
};

const normalizeNavPoint = (value: unknown): NavPoint | null => {
  if (!value || typeof value !== 'object') return null;
  const nav = value as Record<string, unknown>;
  if (typeof nav.date === 'string' && typeof nav.value === 'number') {
    return {
      date: nav.date,
      value: nav.value,
    };
  }
  return null;
};

const normalizeEquityPosition = (value: unknown): EquityPosition | null => {
  if (!value || typeof value !== 'object') return null;
  const equity = value as Record<string, unknown>;

  if (
    typeof equity.symbol !== 'string' ||
    typeof equity.name !== 'string' ||
    typeof equity.sector !== 'string' ||
    typeof equity.shares !== 'number' ||
    typeof equity.averageCost !== 'number' ||
    typeof equity.currentPrice !== 'number'
  ) {
    return null;
  }

  const dividends = Array.isArray(equity.dividends)
    ? equity.dividends
        .map(normalizeDividendPayment)
        .filter((entry): entry is DividendPayment => entry !== null)
    : [];

  const navHistory = Array.isArray(equity.navHistory)
    ? equity.navHistory.map(normalizeNavPoint).filter((entry): entry is NavPoint => entry !== null)
    : [];

  return {
    symbol: equity.symbol,
    name: equity.name,
    sector: equity.sector,
    shares: equity.shares,
    averageCost: equity.averageCost,
    currentPrice: equity.currentPrice,
    dividends,
    navHistory,
  };
};

const normalizePurchaseLot = (value: unknown): PurchaseLot | null => {
  if (!value || typeof value !== 'object') return null;
  const lot = value as Record<string, unknown>;

  if (
    typeof lot.id === 'string' &&
    typeof lot.symbol === 'string' &&
    typeof lot.tradeDate === 'string' &&
    typeof lot.shares === 'number' &&
    typeof lot.pricePerShare === 'number'
  ) {
    return {
      id: lot.id,
      symbol: lot.symbol,
      tradeDate: lot.tradeDate,
      shares: lot.shares,
      pricePerShare: lot.pricePerShare,
    };
  }

  return null;
};

export interface PortfolioImportResult {
  snapshot: PortfolioSnapshot;
  customLots: PurchaseLot[];
}

export const parsePortfolioSnapshot = (raw: unknown): PortfolioSnapshot => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Snapshot must be an object');
  }

  const snapshot = raw as Record<string, unknown>;

  if (typeof snapshot.asOf !== 'string') {
    throw new Error('Snapshot requires an "asOf" ISO date string');
  }

  if (!Array.isArray(snapshot.equities)) {
    throw new Error('Snapshot requires an array of equities with valid fields');
  }

  const equities = snapshot.equities
    .map(normalizeEquityPosition)
    .filter((entry): entry is EquityPosition => entry !== null);

  if (equities.length !== snapshot.equities.length) {
    throw new Error('One or more equities contain invalid fields');
  }

  return {
    asOf: snapshot.asOf,
    equities,
    cashPosition: typeof snapshot.cashPosition === 'number' ? snapshot.cashPosition : undefined,
  };
};

const toImportResult = (raw: unknown): PortfolioImportResult => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Snapshot must be an object');
  }

  const candidate = raw as Record<string, unknown>;

  if (candidate.snapshot && typeof candidate.snapshot === 'object') {
    const snapshot = parsePortfolioSnapshot(candidate.snapshot);
    const maybeLots = candidate.customLots;
    const customLots = Array.isArray(maybeLots)
      ? maybeLots.map(normalizePurchaseLot).filter((entry): entry is PurchaseLot => entry !== null)
      : [];

    return {
      snapshot,
      customLots,
    };
  }

  return {
    snapshot: parsePortfolioSnapshot(candidate),
    customLots: [],
  };
};

export const readSnapshotFile = async (file: File): Promise<PortfolioImportResult> => {
  const contents = await file.text();
  let data: unknown;

  try {
    data = JSON.parse(contents);
  } catch {
    throw new Error('File is not valid JSON');
  }

  return toImportResult(data);
};

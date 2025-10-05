const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

export const formatCurrency = (value: number): string => currencyFormatter.format(value);

export const formatPercent = (value: number): string => percentFormatter.format(value / 100);

export const formatDate = (isoDate: string): string => {
  // Parse date-only strings (YYYY-MM-DD) as local dates to avoid timezone issues
  // For ISO datetime strings, use normal Date parsing
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    // Date-only format: parse as local date by appending time component
    // This ensures the date is interpreted in local timezone, not UTC
    const date = new Date(isoDate + 'T00:00:00');
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  } else {
    // ISO datetime format: parse normally
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(isoDate));
  }
};

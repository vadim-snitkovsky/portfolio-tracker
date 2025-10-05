import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercent, formatDate } from './formatters';

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers as USD currency', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
      expect(formatCurrency(0.99)).toBe('$0.99');
    });

    it('should format negative numbers as USD currency', () => {
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
      expect(formatCurrency(-0.50)).toBe('-$0.50');
    });

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should round to 2 decimal places', () => {
      expect(formatCurrency(1.234)).toBe('$1.23');
      expect(formatCurrency(1.235)).toBe('$1.24');
      expect(formatCurrency(1.999)).toBe('$2.00');
    });

    it('should handle very large numbers', () => {
      expect(formatCurrency(999999999.99)).toBe('$999,999,999.99');
    });

    it('should handle very small numbers', () => {
      expect(formatCurrency(0.01)).toBe('$0.01');
      expect(formatCurrency(0.001)).toBe('$0.00');
    });
  });

  describe('formatPercent', () => {
    it('should format positive percentages', () => {
      expect(formatPercent(50)).toBe('50.0%');
      expect(formatPercent(100)).toBe('100.0%');
      expect(formatPercent(12.5)).toBe('12.5%');
    });

    it('should format negative percentages', () => {
      expect(formatPercent(-25)).toBe('-25.0%');
      expect(formatPercent(-0.5)).toBe('-0.5%');
    });

    it('should format zero correctly', () => {
      expect(formatPercent(0)).toBe('0.0%');
    });

    it('should round to 1 decimal place', () => {
      expect(formatPercent(12.34)).toBe('12.3%');
      expect(formatPercent(12.35)).toBe('12.4%');
      expect(formatPercent(12.99)).toBe('13.0%');
    });

    it('should handle very large percentages', () => {
      expect(formatPercent(1000)).toBe('1,000.0%');
      expect(formatPercent(9999.9)).toBe('9,999.9%');
    });

    it('should handle very small percentages', () => {
      expect(formatPercent(0.1)).toBe('0.1%');
      expect(formatPercent(0.01)).toBe('0.0%');
    });
  });

  describe('formatDate', () => {
    it('should format date-only strings (YYYY-MM-DD)', () => {
      expect(formatDate('2025-01-15')).toBe('Jan 15, 2025');
      expect(formatDate('2024-12-31')).toBe('Dec 31, 2024');
      expect(formatDate('2023-07-04')).toBe('Jul 4, 2023');
    });

    it('should format ISO datetime strings', () => {
      const result = formatDate('2025-01-15T10:30:00Z');
      // Result may vary by timezone, but should contain the date components
      expect(result).toMatch(/Jan \d{1,2}, 2025/);
    });

    it('should handle different months', () => {
      expect(formatDate('2025-01-01')).toBe('Jan 1, 2025');
      expect(formatDate('2025-02-01')).toBe('Feb 1, 2025');
      expect(formatDate('2025-03-01')).toBe('Mar 1, 2025');
      expect(formatDate('2025-04-01')).toBe('Apr 1, 2025');
      expect(formatDate('2025-05-01')).toBe('May 1, 2025');
      expect(formatDate('2025-06-01')).toBe('Jun 1, 2025');
      expect(formatDate('2025-07-01')).toBe('Jul 1, 2025');
      expect(formatDate('2025-08-01')).toBe('Aug 1, 2025');
      expect(formatDate('2025-09-01')).toBe('Sep 1, 2025');
      expect(formatDate('2025-10-01')).toBe('Oct 1, 2025');
      expect(formatDate('2025-11-01')).toBe('Nov 1, 2025');
      expect(formatDate('2025-12-01')).toBe('Dec 1, 2025');
    });

    it('should handle leap years', () => {
      expect(formatDate('2024-02-29')).toBe('Feb 29, 2024');
    });

    it('should handle different years', () => {
      expect(formatDate('2020-06-15')).toBe('Jun 15, 2020');
      expect(formatDate('2030-06-15')).toBe('Jun 15, 2030');
    });
  });
});


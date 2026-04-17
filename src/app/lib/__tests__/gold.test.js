import { describe, it, expect } from 'vitest';
import { formatGold, goldUnitLabel, formatUSD, GRAMS_PER_TROY_OZ } from '../gold.js';

describe('formatGold', () => {
  it('formats grams to 4 decimal places by default', () => {
    expect(formatGold(1.23456, 'g')).toBe('1.2346');
  });

  it('formats ounces correctly', () => {
    const result = formatGold(GRAMS_PER_TROY_OZ, 'oz');
    expect(result).toBe('1.0000');
  });

  it('respects custom digit count', () => {
    expect(formatGold(1.5, 'g', 2)).toBe('1.50');
  });

  it('returns dash for null/NaN', () => {
    expect(formatGold(null, 'g')).toBe('—');
    expect(formatGold(NaN, 'g')).toBe('—');
    expect(formatGold(undefined, 'g')).toBe('—');
  });

  it('handles zero', () => {
    expect(formatGold(0, 'g')).toBe('0.0000');
  });
});

describe('goldUnitLabel', () => {
  it('returns g for grams', () => {
    expect(goldUnitLabel('g')).toBe('g');
  });

  it('returns oz for ounces', () => {
    expect(goldUnitLabel('oz')).toBe('oz');
  });
});

describe('formatUSD', () => {
  it('formats with 2 decimal places and $ prefix', () => {
    expect(formatUSD(100)).toBe('$100.00');
  });

  it('formats large numbers with commas', () => {
    expect(formatUSD(1234.56)).toBe('$1,234.56');
  });

  it('formats zero', () => {
    expect(formatUSD(0)).toBe('$0.00');
  });
});

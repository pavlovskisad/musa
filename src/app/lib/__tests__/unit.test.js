import { describe, it, expect } from 'vitest';
import { computeUnit, getExitPenaltyPct, CONSTRUCTION_DAYS } from '../unit.js';

describe('getExitPenaltyPct', () => {
  it('returns 50% for < 25% elapsed', () => {
    expect(getExitPenaltyPct(0)).toBe(0.50);
    expect(getExitPenaltyPct(0.24)).toBe(0.50);
  });

  it('returns 35% for 25-50% elapsed', () => {
    expect(getExitPenaltyPct(0.25)).toBe(0.35);
    expect(getExitPenaltyPct(0.49)).toBe(0.35);
  });

  it('returns 20% for 50-75% elapsed', () => {
    expect(getExitPenaltyPct(0.50)).toBe(0.20);
    expect(getExitPenaltyPct(0.74)).toBe(0.20);
  });

  it('returns 10% for >= 75% elapsed', () => {
    expect(getExitPenaltyPct(0.75)).toBe(0.10);
    expect(getExitPenaltyPct(1.0)).toBe(0.10);
  });
});

describe('computeUnit', () => {
  const baseUnit = {
    id: 'test-1',
    tier: 'flow',
    pricePaid: 100,
    faceValue: 107,
    gramsTotal: 0.713,
    goldPriceAtPurchase: 150,
    purchasedAt: new Date('2025-01-01').getTime(),
    exitedAt: null,
  };

  it('returns constructing status during construction period', () => {
    const purchaseTime = new Date('2025-01-01T00:00:00Z').getTime();
    const now = new Date(purchaseTime + 30_000);
    const result = computeUnit({ ...baseUnit, purchasedAt: purchaseTime }, now);
    expect(result.computedStatus).toBe('constructing');
    expect(result.gramsDelivered).toBe(0);
    expect(result.pctDelivered).toBe(0);
    expect(result.constructionPct).toBeGreaterThan(0);
    expect(result.constructionPct).toBeLessThan(1);
  });

  it('returns active status after construction ends', () => {
    const now = new Date('2025-03-01');
    const result = computeUnit(baseUnit, now);
    expect(result.computedStatus).toBe('active');
    expect(result.gramsDelivered).toBeGreaterThan(0);
    expect(result.pctDelivered).toBeGreaterThan(0);
    expect(result.pctDelivered).toBeLessThan(1);
  });

  it('returns completed status after full delivery', () => {
    const now = new Date('2026-03-01');
    const result = computeUnit(baseUnit, now);
    expect(result.computedStatus).toBe('completed');
    expect(result.pctDelivered).toBe(1);
    expect(result.gramsDelivered).toBeCloseTo(baseUnit.gramsTotal, 4);
  });

  it('returns exited status for exited units', () => {
    const exitedUnit = {
      ...baseUnit,
      exitedAt: new Date('2025-06-01').getTime(),
      gramsAtExit: 0.3,
    };
    const now = new Date('2025-12-01');
    const result = computeUnit(exitedUnit, now);
    expect(result.computedStatus).toBe('exited');
    expect(result.gramsDelivered).toBe(0.3);
  });

  it('tracks construction progress correctly', () => {
    const purchaseTime = new Date('2025-01-01T00:00:00Z').getTime();
    const now = new Date(purchaseTime + 30_000);
    const result = computeUnit({ ...baseUnit, purchasedAt: purchaseTime }, now);
    expect(result.constructionPct).toBeCloseTo(0.5, 1);
  });
});

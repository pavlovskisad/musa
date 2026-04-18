import { TIERS } from './tiers.js';

export const CONSTRUCTION_DAYS = 1 / 1440;
export const PROCESSING_FEE = 0.02;

export const getExitPenaltyPct = (pctElapsed) => {
  if (pctElapsed < 0.25) return 0.50;
  if (pctElapsed < 0.50) return 0.35;
  if (pctElapsed < 0.75) return 0.20;
  return 0.10;
};

export const computeUnit = (unit, now) => {
  const tier = TIERS[unit.tier];
  const ms = now.getTime() - unit.purchasedAt;
  const daysElapsed = Math.max(0, ms / 86400000);
  const constructionDays = CONSTRUCTION_DAYS;
  const totalDays = tier.lockMonths * 30;
  const deliveryDays = totalDays - constructionDays;

  if (unit.exitedAt) {
    const exitedDaysElapsed = (unit.exitedAt - unit.purchasedAt) / 86400000;
    return {
      ...unit,
      computedStatus: 'exited',
      daysElapsed: exitedDaysElapsed,
      deliveryDays,
      gramsDelivered: unit.gramsAtExit || 0,
      pctDelivered: 0,
    };
  }

  if (daysElapsed < constructionDays) {
    return {
      ...unit,
      computedStatus: 'constructing',
      daysElapsed,
      deliveryDays,
      constructionPct: daysElapsed / constructionDays,
      daysToFirstDelivery: constructionDays - daysElapsed,
      gramsDelivered: 0,
      pctDelivered: 0,
      daysRemaining: totalDays - daysElapsed,
      deliveryElapsed: 0,
    };
  }

  const deliveryElapsed = daysElapsed - constructionDays;
  const pctDelivered = Math.min(1, deliveryElapsed / deliveryDays);
  const gramsDelivered = unit.gramsTotal * pctDelivered;

  return {
    ...unit,
    computedStatus: pctDelivered >= 1 ? 'completed' : 'active',
    daysElapsed,
    deliveryDays,
    deliveryElapsed,
    pctDelivered,
    gramsDelivered,
    daysRemaining: Math.max(0, totalDays - daysElapsed),
  };
};

export const DEFAULT_GOLD_PRICE_PER_GRAM = 150;
export const GRAMS_PER_TROY_OZ = 31.1035;

export const formatGold = (grams, unit, digits = 4) => {
  if (grams == null || isNaN(grams)) return '—';
  if (unit === 'oz') {
    const oz = grams / GRAMS_PER_TROY_OZ;
    return `${oz.toFixed(digits)}`;
  }
  return `${grams.toFixed(digits)}`;
};

export const goldUnitLabel = (unit) => (unit === 'oz' ? 'oz' : 'g');

export const formatUSD = (v) =>
  `$${Number(v).toFixed(2)}`;

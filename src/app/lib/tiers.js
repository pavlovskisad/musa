// Bonuses set 2026-11-22 to what about 4% a year can fund when gold is delivered evenly from day one:
// bonus = rate x average wait (0.25, 0.5, 1 year). See docs/TREASURY.md section 11.
export const TIERS = {
  spark: {
    id: 'spark',
    name: 'Spark',
    lockMonths: 6,
    discount: 0.01,
    annualized: 0.04,
    description: 'Six months. Light commitment.',
    cancellable: false,
  },
  flow: {
    id: 'flow',
    name: 'Flow',
    lockMonths: 12,
    discount: 0.02,
    annualized: 0.04,
    description: 'A year of patient accumulation.',
    cancellable: true,
  },
  vein: {
    id: 'vein',
    name: 'Vein',
    lockMonths: 24,
    discount: 0.04,
    annualized: 0.04,
    description: 'Two years. Maximum reward.',
    cancellable: true,
  },
};

export const PRESET_AMOUNTS = [20, 50, 100, 500, 1000];

export const TIME_SPEEDS = [
  { label: '1×', mult: 1 },
  { label: '1d/s', mult: 86400 },
  { label: '1w/s', mult: 604800 },
  { label: '1mo/s', mult: 2592000 },
];

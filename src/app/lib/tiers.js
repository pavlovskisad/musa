// Target bonuses (2026-11-22): 1.5 / 4 / 10%. With gold delivered evenly from day one the money is held for
// half the term on average, so these cost whoever funds them 6 / 8 / 10% a year. T-bill-level yield funds about
// 1 / 2 / 4%; the rest needs a supplier paying for prepaid money. See docs/TREASURY.md section 11.
export const TIERS = {
  spark: {
    id: 'spark',
    name: 'Spark',
    lockMonths: 6,
    discount: 0.015,
    annualized: 0.06,
    description: 'Six months. Light commitment.',
    cancellable: false,
  },
  flow: {
    id: 'flow',
    name: 'Flow',
    lockMonths: 12,
    discount: 0.04,
    annualized: 0.08,
    description: 'A year of patient accumulation.',
    cancellable: true,
  },
  vein: {
    id: 'vein',
    name: 'Vein',
    lockMonths: 24,
    discount: 0.10,
    annualized: 0.10,
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

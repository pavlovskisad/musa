// capture only: modest sample bonuses, in line with the figures on the overview page
export const TIERS = {
  spark: {
    id: 'spark',
    name: 'Spark',
    lockMonths: 6,
    discount: 0.011,
    annualized: 0.038,
    description: 'Six months. Light commitment.',
    cancellable: false,
  },
  flow: {
    id: 'flow',
    name: 'Flow',
    lockMonths: 12,
    discount: 0.021,
    annualized: 0.039,
    description: 'A year of patient accumulation.',
    cancellable: true,
  },
  vein: {
    id: 'vein',
    name: 'Vein',
    lockMonths: 24,
    discount: 0.044,
    annualized: 0.042,
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

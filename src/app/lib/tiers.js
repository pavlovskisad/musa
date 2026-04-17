export const TIERS = {
  spark: {
    id: 'spark',
    name: 'Spark',
    lockMonths: 6,
    discount: 0.025,
    annualized: 0.05,
    description: 'Six months. Light commitment.',
    cancellable: false,
  },
  flow: {
    id: 'flow',
    name: 'Flow',
    lockMonths: 12,
    discount: 0.07,
    annualized: 0.07,
    description: 'A year of patient accumulation.',
    cancellable: true,
  },
  vein: {
    id: 'vein',
    name: 'Vein',
    lockMonths: 24,
    discount: 0.188,
    annualized: 0.09,
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

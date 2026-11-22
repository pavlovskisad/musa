// capture only: fixed reserve figures (the same ones shown on the page until now) in place of live chain reads
export * from '../../src/app/lib/chain.js';
export async function readPaxgBalance() { return 0.156753; }
export async function readSolvencyRatio() { return 54.852; }
export async function readReserveBalance() { return 3105.47 / 31.1034768; } // the screen converts troy ounces to grams
export async function readTotalOutstandingGrams() { return 56.62; }

import { createContext, useContext } from 'react';
import { DEFAULT_GOLD_PRICE_PER_GRAM } from '../lib/gold.js';

export const GoldContext = createContext({
  price: DEFAULT_GOLD_PRICE_PER_GRAM,
  unit: 'g',
  priceSource: 'default',
});

export const useGold = () => useContext(GoldContext);

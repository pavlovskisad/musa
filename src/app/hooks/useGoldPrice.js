import { useState, useEffect } from 'react';
import { DEFAULT_GOLD_PRICE_PER_GRAM, GRAMS_PER_TROY_OZ } from '../lib/gold.js';

export function useGoldPrice() {
  const [goldPrice, setGoldPrice] = useState(DEFAULT_GOLD_PRICE_PER_GRAM);
  const [priceSource, setPriceSource] = useState('default');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd'
        );
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        const paxgUsd = data?.['pax-gold']?.usd;
        if (paxgUsd && !cancelled) {
          const perGram = paxgUsd / GRAMS_PER_TROY_OZ;
          setGoldPrice(parseFloat(perGram.toFixed(2)));
          setPriceSource('live');
        }
      } catch {
        if (!cancelled) setPriceSource('failed');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { goldPrice, setGoldPrice, priceSource, setPriceSource };
}

import React from 'react';
import { RotateCcw } from 'lucide-react';
import { TIME_SPEEDS } from '../lib/tiers.js';
import { GRAMS_PER_TROY_OZ } from '../lib/gold.js';

function DevStrip({ timeMult, setTimeMult, simTime, onReset, goldUnit, setGoldUnit, goldPrice, priceSource }) {
  return (
    <div
      className="flex-shrink-0 px-3 pt-2 pb-2 flex items-center gap-1.5 border-b border-app"
      style={{ background: 'rgba(255,255,255,0.015)' }}
    >
      <div className="flex items-center gap-0.5">
        {TIME_SPEEDS.map(s => (
          <button
            key={s.label}
            onClick={() => setTimeMult(s.mult)}
            className={`press-soft h-6 px-2 rounded-full text-[9px] font-num border ${
              timeMult === s.mult
                ? 'bg-gold text-black border-gold'
                : 'border-app text-dim'
            }`}
            style={{ minWidth: '32px' }}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex-1" />
      {/* Gold price dot + value */}
      <div
        className="flex items-center gap-1 text-[9px] font-num px-1.5 whitespace-nowrap"
        title={priceSource === 'live' ? 'Live from CoinGecko PAXG' : priceSource === 'failed' ? 'Live fetch failed, using default' : 'Default price'}
      >
        <span
          className="w-1 h-1 rounded-full"
          style={{ background: priceSource === 'live' ? 'var(--gold)' : 'var(--text-dim)' }}
        />
        <span className="text-gold">
          {goldUnit === 'oz'
            ? `$${(goldPrice * GRAMS_PER_TROY_OZ).toFixed(0)}/oz`
            : `$${goldPrice.toFixed(0)}/g`}
        </span>
      </div>
      {/* g / oz toggle */}
      <div className="h-6 rounded-full border border-app flex items-center overflow-hidden">
        <button
          onClick={() => setGoldUnit('g')}
          className={`h-full px-1.5 text-[9px] font-num ${goldUnit === 'g' ? 'bg-gold text-black' : 'text-dim'}`}
        >
          g
        </button>
        <button
          onClick={() => setGoldUnit('oz')}
          className={`h-full px-1.5 text-[9px] font-num ${goldUnit === 'oz' ? 'bg-gold text-black' : 'text-dim'}`}
        >
          oz
        </button>
      </div>
      <button
        onClick={onReset}
        className="press w-6 h-6 rounded-full border border-app flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.03)' }}
        title="Reset"
      >
        <RotateCcw size={10} className="text-dim" />
      </button>
    </div>
  );
}

export default DevStrip;

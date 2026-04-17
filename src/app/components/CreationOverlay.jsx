import React from 'react';
import { TIERS } from '../lib/tiers.js';
import { useGold } from '../context/GoldContext.jsx';
import { formatGold, goldUnitLabel } from '../lib/gold.js';

function CreationOverlay({ tierId, amount }) {
  const tier = TIERS[tierId];
  const { price, unit: goldUnit } = useGold();
  const grams = (amount * (1 + tier.discount)) / price;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center creation-overlay"
      style={{ background: 'rgba(10, 9, 8, 0.96)' }}
    >
      {/* Background grid */}
      <div className="absolute inset-0 dot-grid creation-grid" />

      {/* Scan line */}
      <div className="creation-scan" />

      {/* Expanding rings */}
      <div className="creation-ring creation-ring-1" />
      <div className="creation-ring creation-ring-2" />
      <div className="creation-ring creation-ring-3" />

      {/* Center content */}
      <div className="relative flex flex-col items-center">
        <div className="creation-core flex flex-col items-center">
          <div
            className="w-14 h-14 rounded-full border border-gold flex items-center justify-center mb-6"
            style={{ background: 'rgba(201,169,97,0.08)', boxShadow: '0 0 30px rgba(201,169,97,0.35)' }}
          >
            <div className="w-2 h-2 rounded-full bg-gold pulse-gold" />
          </div>
        </div>
        <div className="creation-text text-center">
          <div className="text-[10px] uppercase tracking-[0.4em] text-gold mb-3">Initializing</div>
          <div className="font-display text-app text-3xl" style={{ fontWeight: 300 }}>
            {tier.name}
          </div>
          <div className="text-[11px] font-num text-dim mt-2">
            {formatGold(grams, goldUnit)}{goldUnitLabel(goldUnit)} committed
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreationOverlay;

import React, { useEffect } from 'react';
import { TIERS } from '../lib/tiers.js';
import { useGold } from '../context/GoldContext.jsx';
import { formatGold, goldUnitLabel } from '../lib/gold.js';

function CelebrationOverlay({ unit, onDismiss }) {
  const tier = TIERS[unit.tier];
  const { unit: goldUnit } = useGold();

  useEffect(() => {
    const t = setTimeout(onDismiss, 4200);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center celebration-overlay"
      style={{ background: 'rgba(10, 9, 8, 0.97)' }}
      onClick={onDismiss}
    >
      <div className="absolute inset-0 dot-grid celebration-grid" />

      {/* Outward expanding rings — like the creation overlay but gentler */}
      <div className="celebration-ring celebration-ring-1" />
      <div className="celebration-ring celebration-ring-2" />
      <div className="celebration-ring celebration-ring-3" />

      <div className="relative flex flex-col items-center celebration-text">
        <div className="text-[10px] uppercase tracking-[0.4em] text-gold mb-4">Delivered</div>
        <div
          className="font-display italic text-gold text-center mb-2"
          style={{ fontWeight: 400, fontSize: '56px', lineHeight: '1' }}
        >
          {tier.name}
        </div>
        <div
          className="font-display font-num text-app mt-6"
          style={{ fontWeight: 300, fontSize: '42px', lineHeight: '1' }}
        >
          {formatGold(unit.gramsTotal, goldUnit)}
          <span className="text-xl text-dim ml-2" style={{ fontFamily: "'Fraunces', serif" }}>
            {goldUnitLabel(goldUnit)}
          </span>
        </div>
        <div className="text-[11px] text-dim font-num mt-4">
          complete · yours to keep
        </div>
        <div className="text-[9px] text-dim mt-8 opacity-60">
          tap to dismiss
        </div>
      </div>
    </div>
  );
}

export default CelebrationOverlay;

import React from 'react';
import { TIERS } from '../lib/tiers.js';
import { useGold } from '../context/GoldContext.jsx';
import { formatGold, goldUnitLabel } from '../lib/gold.js';
import Particles from './Particles.jsx';
import Radar from './Radar.jsx';

function UnitCard({ unit, onClick, highlight }) {
  const { unit: goldUnit } = useGold();
  const tier = TIERS[unit.tier];
  const status = unit.computedStatus;
  const isActive = status === 'active';
  const isConstructing = status === 'constructing';
  const isComplete = status === 'completed';
  const statusLabel = {
    constructing: 'Preparing',
    active: 'Mining',
    completed: 'Complete',
  }[status];

  return (
    <button
      onClick={onClick}
      className={`press-soft relative w-full text-left p-5 rounded-2xl border overflow-hidden ${
        highlight ? 'border-gold gold-glow anim-pop' : isComplete ? 'unit-card-complete' : 'bg-surface border-app'
      } ${isActive || isConstructing ? 'surface-breath' : ''}`}
    >
      {/* Ambient background layer */}
      {isActive && <Particles tier={unit.tier} />}
      {isConstructing && (
        <div className="ambient-sweep">
          <Radar />
        </div>
      )}
      {/* Completed shimmer overlay */}
      {isComplete && <div className="unit-card-complete-shimmer" />}

      <div className="relative flex items-start justify-between mb-4">
        <div>
          <div className={`font-display text-xl flex items-center gap-2 ${isComplete ? 'text-black' : 'text-app'}`} style={{ fontWeight: 400 }}>
            {tier.name}
            {isActive && (
              <span className="relative inline-flex items-center justify-center" style={{ width: '8px', height: '8px' }}>
                <span className="pulse-ring" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-gold" />
              </span>
            )}
          </div>
          <div className={`text-[10px] uppercase tracking-[0.2em] font-num mt-1 ${isComplete ? 'text-black opacity-60' : 'text-dim'}`}>
            {statusLabel} · {tier.lockMonths}mo
          </div>
        </div>
        <div className="text-right">
          <div className={`text-base font-num ${isActive ? 'pulse-gold' : ''} ${isComplete ? 'text-black' : 'text-app'}`}>
            {formatGold(unit.gramsDelivered, goldUnit, 6)}{goldUnitLabel(goldUnit)}
          </div>
          <div className={`text-[10px] font-num mt-0.5 ${isComplete ? 'text-black opacity-50' : 'text-dim'}`}>of {formatGold(unit.gramsTotal, goldUnit, 3)}{goldUnitLabel(goldUnit)}</div>
          {(unit.gramsClaimed || 0) > 0 && (
            <div className="text-[9px] font-num mt-0.5 text-gold">{formatGold(unit.gramsClaimed, goldUnit, 4)}{goldUnitLabel(goldUnit)} claimed</div>
          )}
        </div>
      </div>
      <div className="relative h-[3px] rounded-full overflow-hidden z-10" style={{ background: isComplete ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.06)' }}>
        <div
          className={`h-full progress-fill relative overflow-hidden ${isComplete ? '' : 'bg-gold'}`}
          style={{
            width: `${isConstructing ? unit.constructionPct * 100 : unit.pctDelivered * 100}%`,
            background: isComplete ? 'rgba(0,0,0,0.5)' : undefined,
          }}
        >
          {(isActive || isConstructing) && <div className="progress-shimmer" />}
        </div>
      </div>
    </button>
  );
}

export default UnitCard;

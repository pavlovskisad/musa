import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { TIERS } from '../lib/tiers.js';
import { useGold } from '../context/GoldContext.jsx';
import { formatGold, goldUnitLabel, formatUSD } from '../lib/gold.js';
import MusaLogo from '../components/MusaLogo.jsx';
import Particles from '../components/Particles.jsx';
import Radar from '../components/Radar.jsx';
import Row from '../components/Row.jsx';

function UnitDetailScreen({ unit, onBack, onHome, onExit, onClaim }) {
  const tier = TIERS[unit.tier];
  const { price, unit: goldUnit } = useGold();
  const status = unit.computedStatus;
  const isConstructing = status === 'constructing';
  const isActive = status === 'active';
  const isComplete = status === 'completed';
  const dailyRate = unit.gramsTotal / unit.deliveryDays;
  const [claiming, setClaiming] = React.useState(false);
  const claimable = Math.max(0, (unit.gramsDelivered || 0) - (unit.gramsClaimed || 0));
  const canClaim = (isActive || isComplete) && unit.positionId != null && claimable > 1e-9;

  const handleClaim = async () => {
    if (!onClaim || claiming) return;
    setClaiming(true);
    try { await onClaim(); } finally { setClaiming(false); }
  };

  return (
    <div className="h-full flex flex-col anim-slide-right relative">
      {/* Full-screen ambient layer — particles only, construction ambient is inlined in its hero */}
      {isActive && <Particles large />}

      <div className="relative px-6 pt-3 pb-4 flex items-center justify-between">
        <div className="min-w-[60px]">
          <button
            onClick={onBack}
            className="press w-9 h-9 rounded-full border border-app flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <ArrowLeft size={15} className="text-dim" />
          </button>
        </div>
        <MusaLogo />
        <div className="text-[10px] uppercase tracking-[0.3em] text-dim min-w-[60px] text-right">
          {isConstructing && 'Preparing'}
          {isActive && 'Mining'}
          {isComplete && 'Complete'}
        </div>
      </div>

      <div className="relative px-6 pb-5">
        <h1
          className="font-display text-app flex items-center gap-3"
          style={{ fontWeight: 300, fontSize: '48px', lineHeight: '1' }}
        >
          {tier.name}
          {isActive && (
            <span className="relative inline-flex items-center justify-center" style={{ width: '12px', height: '12px' }}>
              <span className="pulse-ring" />
              <span className="relative w-2 h-2 rounded-full bg-gold" />
            </span>
          )}
        </h1>
      </div>

      <div className="relative px-6 pb-5">
        {isConstructing ? (
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-3">Construction</div>
                <div
                  className="font-display text-app"
                  style={{ fontWeight: 300, fontSize: '36px', lineHeight: '1' }}
                >
                  Preparing...
                </div>
                <div className="text-xs text-dim mt-3">Mining begins momentarily</div>
              </div>
              <div className="relative" style={{ width: '100px', height: '100px' }}>
                <Radar large />
              </div>
            </div>

            <div className="relative mt-5 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full bg-gold progress-fill relative overflow-hidden"
                style={{ width: `${unit.constructionPct * 100}%` }}
              >
                <div className="progress-shimmer" />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-3">Mined</div>
            <div
              className={`font-display font-num text-app ${isActive ? 'pulse-gold' : ''}`}
              style={{ fontWeight: 300, fontSize: '60px', lineHeight: '1' }}
            >
              {formatGold(unit.gramsDelivered, goldUnit)}
              <span
                className="text-2xl text-dim ml-2"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {goldUnitLabel(goldUnit)}
              </span>
            </div>
            <div className="text-xs text-dim font-num mt-3">
              of {formatGold(unit.gramsTotal, goldUnit, 3)}{goldUnitLabel(goldUnit)} · {formatUSD(unit.gramsDelivered * price)}
            </div>

            <div className="relative mt-5 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full bg-gold progress-fill relative overflow-hidden"
                style={{ width: `${unit.pctDelivered * 100}%` }}
              >
                {isActive && <div className="progress-shimmer" />}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="relative px-6 pb-5">
        <div className="bg-surface border border-app rounded-2xl p-5 space-y-2.5">
          <Row label="Paid" value={formatUSD(unit.pricePaid)} />
          <Row label="Total gold" value={`${formatGold(unit.gramsTotal, goldUnit)}${goldUnitLabel(goldUnit)}`} />
          <Row label="Lock period" value={`${tier.lockMonths} months`} />
          <Row label="Daily rate" value={`+${formatGold(dailyRate, goldUnit, 5)}${goldUnitLabel(goldUnit)}`} />
          <Row label="Days remaining" value={`${Math.ceil(unit.daysRemaining)}`} />
        </div>
      </div>

      <div className="relative flex-1" />

      {canClaim && (
        <div className="relative px-6 pb-3">
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="press w-full h-14 rounded-full bg-gold text-black font-medium tracking-wide flex items-center justify-center gap-2"
            style={{ opacity: claiming ? 0.6 : 1 }}
          >
            {claiming ? 'Claiming...' : `Claim ${formatGold(claimable, goldUnit, 4)}${goldUnitLabel(goldUnit)}`}
          </button>
        </div>
      )}

      {tier.cancellable && isActive && (
        <div className="relative p-6 pb-12">
          <button
            onClick={onExit}
            className="press w-full h-12 rounded-full border border-app text-dim text-xs font-medium tracking-wide"
          >
            Exit early
          </button>
        </div>
      )}

      {isComplete && !canClaim && (
        <div className="relative p-6 pb-12">
          <div className="text-center text-[11px] text-gold uppercase tracking-[0.3em]">
            All gold delivered
          </div>
        </div>
      )}

      {!tier.cancellable && isActive && !canClaim && (
        <div className="relative p-6 pb-12">
          <div className="text-center text-[10px] text-dim">
            Spark mines complete on schedule. No early exit.
          </div>
        </div>
      )}
    </div>
  );
}

export default UnitDetailScreen;

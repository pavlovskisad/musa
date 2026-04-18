import React from 'react';
import { ArrowLeft, Plus, Sparkles, User } from 'lucide-react';
import { useGold } from '../context/GoldContext.jsx';
import { formatGold, goldUnitLabel, formatUSD } from '../lib/gold.js';
import MusaLogo from '../components/MusaLogo.jsx';
import UnitCard from '../components/UnitCard.jsx';

const STATS = [
  { key: 'mined', label: 'Mined' },
  { key: 'claimed', label: 'Claimed' },
  { key: 'unclaimed', label: 'Unclaimed' },
  { key: 'pending', label: 'Pending' },
];

function HomeScreen({ units, totals, recentlyPurchased, onBuy, onUnit, onHome, onProfile, onClaimAll, userName }) {
  const hasUnits = units.length > 0;
  const { unit: goldUnit } = useGold();
  const [claimingAll, setClaimingAll] = React.useState(false);
  const [activeStat, setActiveStat] = React.useState('mined');
  const [transitioning, setTransitioning] = React.useState(false);
  const canClaimAll = totals.totalClaimable > 1e-9;

  const statValues = {
    mined: totals.totalGrams,
    claimed: totals.totalClaimed,
    unclaimed: totals.totalClaimable,
    pending: totals.pendingGrams,
  };

  const switchStat = (key) => {
    if (key === activeStat) return;
    setTransitioning(true);
    setTimeout(() => {
      setActiveStat(key);
      setTransitioning(false);
    }, 150);
  };

  const handleClaimAll = async () => {
    if (!onClaimAll || claimingAll) return;
    setClaimingAll(true);
    try { await onClaimAll(); } finally { setClaimingAll(false); }
  };

  return (
    <div className="h-full flex flex-col anim-fade">
      {/* Header */}
      <div className="px-6 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={onHome}
          className="press w-9 h-9 rounded-full border border-app flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.03)' }}
          aria-label="Back to start"
        >
          <ArrowLeft size={15} className="text-dim" />
        </button>
        <MusaLogo />
        <button
          onClick={onProfile}
          className="press w-9 h-9 rounded-full border border-app flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.03)' }}
          aria-label="Profile"
        >
          <User size={14} className="text-dim" />
        </button>
      </div>

      {/* Hero */}
      <div className="px-6 pt-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-[0.3em] text-dim">
            {userName ? `musa ${userName}'s gold` : 'Your gold'}
          </div>
          {canClaimAll && (
            <button
              onClick={handleClaimAll}
              disabled={claimingAll}
              className="press h-7 px-3.5 rounded-full border border-gold text-gold text-[10px] font-medium tracking-wide disabled:opacity-40 flex-shrink-0"
            >
              {claimingAll ? 'Claiming…' : 'Claim all'}
            </button>
          )}
        </div>

        {/* Big counter with transition */}
        <div style={{ position: 'relative', overflow: 'hidden', height: '60px' }}>
          <div
            style={{
              transition: 'opacity 0.15s ease-out, transform 0.15s ease-out',
              opacity: transitioning ? 0 : 1,
              transform: transitioning ? 'translateY(8px)' : 'translateY(0)',
            }}
          >
            <div
              className="font-display font-num text-app"
              style={{ fontWeight: 300, fontSize: '60px', lineHeight: '1' }}
            >
              {formatGold(statValues[activeStat], goldUnit)}
              <span className="text-2xl text-dim ml-2" style={{ fontFamily: "'Fraunces', serif" }}>{goldUnitLabel(goldUnit)}</span>
            </div>
          </div>
        </div>

        {/* USD value */}
        <div className="text-sm text-dim font-num mt-2 mb-3">
          {formatUSD(totals.totalValueUSD)}
        </div>

        {/* Stat pills */}
        <div className="flex gap-2">
          {STATS.map(s => (
            <button
              key={s.key}
              onClick={() => switchStat(s.key)}
              className={`press-soft h-7 px-3 rounded-full text-[10px] font-medium tracking-wide border transition-colors duration-200 ${
                activeStat === s.key
                  ? 'border-gold text-gold'
                  : 'border-app text-dim'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 h-px" style={{ background: 'var(--border)' }} />

      {/* Units */}
      <div className="flex-1 overflow-auto scrollable">
        <div className="px-6 pt-5 pb-28">
          {!hasUnits ? (
            <div className="h-full flex flex-col items-center justify-center text-center pt-16">
              <div
                className="w-14 h-14 rounded-full border border-app flex items-center justify-center mb-5"
                style={{ background: 'rgba(201,169,97,0.05)' }}
              >
                <Sparkles size={18} className="text-gold" />
              </div>
              <div className="font-display text-xl mb-2 text-app" style={{ fontWeight: 400 }}>
                No mines yet
              </div>
              <div className="text-dim text-xs max-w-[220px] leading-relaxed">
                Start your first mine. Pick how long you're willing to wait for your gold.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-3 flex items-center justify-between">
                <span>Active mines</span>
                <span className="font-num">{units.length}</span>
              </div>
              {units.map(unit => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                  onClick={() => onUnit(unit.id)}
                  highlight={unit.id === recentlyPurchased}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        className="absolute bottom-0 left-0 right-0 px-6 pb-10 pt-10 pointer-events-none"
        style={{ background: 'linear-gradient(to top, var(--bg) 55%, rgba(10,9,8,0.85) 85%, transparent)' }}
      >
        <button
          onClick={onBuy}
          className="press pointer-events-auto w-full h-14 rounded-full bg-gold text-black font-medium tracking-wide flex items-center justify-center gap-2"
        >
          <Plus size={18} strokeWidth={2.5} />
          New mine
        </button>
      </div>
    </div>
  );
}

export default HomeScreen;

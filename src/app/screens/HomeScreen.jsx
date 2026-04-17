import React from 'react';
import { ArrowLeft, Plus, Sparkles, Settings } from 'lucide-react';
import { useGold } from '../context/GoldContext.jsx';
import { formatGold, goldUnitLabel, formatUSD } from '../lib/gold.js';
import MusaLogo from '../components/MusaLogo.jsx';
import UnitCard from '../components/UnitCard.jsx';

function HomeScreen({ units, totals, recentlyPurchased, onBuy, onUnit, onHome, onSettings }) {
  const hasUnits = units.length > 0;
  const { unit: goldUnit } = useGold();

  return (
    <div className="h-full flex flex-col anim-fade">
      {/* Header (back to onboarding, musa logo, settings) */}
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
          onClick={onSettings}
          className="press w-9 h-9 rounded-full border border-app flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.03)' }}
          aria-label="Settings"
        >
          <Settings size={14} className="text-dim" />
        </button>
      </div>

      {/* Hero */}
      <div className="px-6 pt-6 pb-7">
        <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-3">Your gold</div>
        <div
          className="font-display font-num text-app"
          style={{ fontWeight: 300, fontSize: '60px', lineHeight: '1' }}
        >
          {formatGold(totals.totalGrams, goldUnit)}
          <span className="text-2xl text-dim ml-2" style={{ fontFamily: "'Fraunces', serif" }}>{goldUnitLabel(goldUnit)}</span>
        </div>
        <div className="text-sm text-dim font-num mt-3 flex items-center gap-3">
          <span>{formatUSD(totals.totalValueUSD)}</span>
          {totals.pendingGrams > 0.0001 && (
            <>
              <span className="text-dim opacity-40">·</span>
              <span className="text-gold">+{formatGold(totals.pendingGrams, goldUnit, 3)}{goldUnitLabel(goldUnit)} pending</span>
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-6 h-px" style={{ background: 'var(--border)' }} />

      {/* Units */}
      <div className="flex-1 overflow-auto scrollable">
        <div className="px-6 pt-5 pb-36">
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
        className="absolute bottom-0 left-0 right-0 px-6 pb-12 pt-14 pointer-events-none"
        style={{ background: 'linear-gradient(to top, var(--bg) 50%, rgba(10,9,8,0.85) 80%, transparent)' }}
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

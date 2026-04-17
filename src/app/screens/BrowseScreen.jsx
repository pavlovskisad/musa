import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { TIERS } from '../lib/tiers.js';
import MusaLogo from '../components/MusaLogo.jsx';

function Stat({ label, value, accent }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.15em] text-dim">{label}</div>
      <div className={`text-sm font-num mt-1 ${accent ? 'text-gold' : 'text-app'}`}>{value}</div>
    </div>
  );
}

function BrowseScreen({ onBack, onHome, onSelect }) {
  return (
    <div className="h-full flex flex-col anim-slide-right">
      <div className="px-6 pt-3 pb-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="press w-9 h-9 rounded-full border border-app flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <ArrowLeft size={15} className="text-dim" />
        </button>
        <MusaLogo />
        <div className="w-9" />
      </div>

      <div className="px-6 pt-2 pb-7">
        <h1
          className="font-display text-app"
          style={{ fontWeight: 300, fontSize: '44px', lineHeight: '1' }}
        >
          Pick your
          <br />
          <span className="italic text-gold">mine.</span>
        </h1>
        <p className="text-xs text-dim mt-4 max-w-[280px] leading-relaxed">
          The longer you wait, the more gold you receive per dollar.
        </p>
      </div>

      <div className="flex-1 px-6 space-y-3 overflow-auto scrollable pb-8">
        {Object.values(TIERS).map((tier, i) => (
          <button
            key={tier.id}
            onClick={() => onSelect(tier.id)}
            className="press-soft anim-slide-up w-full text-left p-5 rounded-2xl bg-surface border border-app"
            style={{ animationDelay: `${0.08 + i * 0.08}s` }}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="font-display text-app text-2xl" style={{ fontWeight: 400 }}>
                  {tier.name}
                </div>
                <div className="text-[11px] text-dim mt-1">{tier.description}</div>
              </div>
              <ChevronRight size={16} className="text-dim mt-1.5" />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-app">
              <Stat label="Lock" value={`${tier.lockMonths} mo`} />
              <Stat label="Discount" value={`${(tier.discount * 100).toFixed(1)}%`} accent />
              <Stat label="Per year" value={`+${(tier.annualized * 100).toFixed(0)}%`} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default BrowseScreen;

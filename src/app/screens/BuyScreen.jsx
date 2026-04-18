import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { TIERS, PRESET_AMOUNTS } from '../lib/tiers.js';
import { useGold } from '../context/GoldContext.jsx';
import { formatGold, goldUnitLabel, formatUSD } from '../lib/gold.js';
import { CONSTRUCTION_DAYS } from '../lib/unit.js';
import MusaLogo from '../components/MusaLogo.jsx';
import Row from '../components/Row.jsx';

function BuyScreen({ tierId, amount, setAmount, onBack, onHome, onConfirm }) {
  const tier = TIERS[tierId];
  const { price, unit: goldUnit } = useGold();
  const faceValue = amount * (1 + tier.discount);
  const grams = faceValue / price;
  const dailyGrams = grams / (tier.lockMonths * 30 - CONSTRUCTION_DAYS);

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

      <div className="flex-1 overflow-auto scrollable">
        {/* Tier name + amount on one row to save vertical space */}
        <div className="px-6 pb-5 flex items-end justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-2">
              {tier.lockMonths} month lock
            </div>
            <h1
              className="font-display text-app"
              style={{ fontWeight: 300, fontSize: '44px', lineHeight: '1' }}
            >
              {tier.name}
            </h1>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-2">Amount</div>
            <div
              className="font-display font-num text-app"
              style={{ fontWeight: 300, fontSize: '40px', lineHeight: '1' }}
            >
              ${amount}
            </div>
          </div>
        </div>

        <div className="px-6 pb-5">
          <div className="grid grid-cols-5 gap-2">
            {PRESET_AMOUNTS.map(a => (
              <button
                key={a}
                onClick={() => setAmount(a)}
                className={`press-soft h-10 rounded-full text-[11px] font-num border ${
                  amount === a
                    ? 'bg-gold text-black border-gold'
                    : 'border-app text-dim'
                }`}
              >
                ${a}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="bg-surface border border-app rounded-2xl p-5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-3">You'll receive</div>
            <div
              className="font-display font-num text-app mb-1"
              style={{ fontWeight: 300, fontSize: '34px', lineHeight: '1' }}
            >
              {formatGold(grams, goldUnit)}
              <span
                className="text-xl text-dim ml-1.5"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {goldUnitLabel(goldUnit)}
              </span>
            </div>
            <div className="text-xs text-dim font-num">
              {formatUSD(faceValue)} at today's spot
            </div>

            <div className="mt-4 pt-4 border-t border-app space-y-2.5">
              <Row label="Discount on spot" value={`${(tier.discount * 100).toFixed(1)}%`} accent />
              <Row label="Construction" value="< 1 min" />
              <Row label="Daily rate" value={`+${formatGold(dailyGrams, goldUnit, 5)}${goldUnitLabel(goldUnit)}`} />
              <Row label="First gold" value="Almost immediately" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 pb-12">
        <button
          onClick={onConfirm}
          className="press w-full h-14 rounded-full bg-gold text-black font-medium tracking-wide"
        >
          Buy {tier.name}
        </button>
      </div>
    </div>
  );
}

export default BuyScreen;

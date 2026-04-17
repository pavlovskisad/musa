import React from 'react';
import { X } from 'lucide-react';
import { TIERS } from '../lib/tiers.js';
import { useGold } from '../context/GoldContext.jsx';
import { formatGold, goldUnitLabel } from '../lib/gold.js';
import { getExitPenaltyPct } from '../lib/unit.js';
import MusaLogo from '../components/MusaLogo.jsx';
import Row from '../components/Row.jsx';

function ExitScreen({ unit, onBack, onHome, onConfirm }) {
  const tier = TIERS[unit.tier];
  const { price, unit: goldUnit } = useGold();
  const totalDeliveryDays = tier.lockMonths * 30;
  const pctElapsed = unit.deliveryElapsed ? unit.deliveryElapsed / totalDeliveryDays : 0;
  const penaltyPct = getExitPenaltyPct(pctElapsed);

  const undeliveredGrams = Math.max(0, unit.gramsTotal - unit.gramsDelivered);
  const undeliveredValue = undeliveredGrams * price;
  const refundValue = undeliveredValue * (1 - penaltyPct);
  const refundGrams = refundValue / price;
  const totalReceived = unit.gramsDelivered + refundGrams;

  return (
    <div className="h-full flex flex-col anim-slide-up-big">
      <div className="px-6 pt-3 pb-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="press w-9 h-9 rounded-full border border-app flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <X size={15} className="text-dim" />
        </button>
        <MusaLogo />
        <div className="w-9" />
      </div>

      <div className="px-6 pt-1 pb-7">
        <h1
          className="font-display text-app"
          style={{ fontWeight: 300, fontSize: '48px', lineHeight: '1' }}
        >
          Exit
          <br />
          <span className="italic text-gold">early?</span>
        </h1>
        <p className="text-xs text-dim mt-4 max-w-[280px] leading-relaxed">
          You can close this contract now. A penalty applies on undelivered gold. Already-mined gold stays yours.
        </p>
      </div>

      <div className="px-6 pb-5">
        <div className="bg-surface border border-app rounded-2xl p-5 space-y-3">
          <Row label="Already mined" value={`${formatGold(unit.gramsDelivered, goldUnit)}${goldUnitLabel(goldUnit)}`} />
          <Row label="Undelivered" value={`${formatGold(undeliveredGrams, goldUnit)}${goldUnitLabel(goldUnit)}`} />
          <Row label="Penalty" value={`${(penaltyPct * 100).toFixed(0)}%`} accent />
          <div className="pt-3 mt-1 border-t border-app">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-[0.2em] text-dim">You receive</span>
              <span className="font-num text-app text-base">{formatGold(totalReceived, goldUnit)}{goldUnitLabel(goldUnit)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6">
        <div className="text-[11px] text-dim leading-relaxed">
          The penalty decreases as more time passes. Wait, and you'll receive your full {formatGold(unit.gramsTotal, goldUnit, 3)}{goldUnitLabel(goldUnit)}.
        </div>
      </div>

      <div className="flex-1" />

      <div className="p-6 pb-12 space-y-2">
        <button
          onClick={onConfirm}
          className="press w-full h-14 rounded-full border text-sm"
          style={{ color: '#e87560', borderColor: 'rgba(232,117,96,0.3)' }}
        >
          Confirm exit
        </button>
        <button
          onClick={onBack}
          className="w-full h-12 text-dim text-xs"
        >
          Keep mining
        </button>
      </div>
    </div>
  );
}

export default ExitScreen;

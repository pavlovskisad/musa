import React, { useState, useEffect } from 'react';
import { ArrowLeft, Wallet } from 'lucide-react';
import { useGold } from '../context/GoldContext.jsx';
import { formatGold, goldUnitLabel, formatUSD, GRAMS_PER_TROY_OZ } from '../lib/gold.js';
import { readPaxgBalance } from '../lib/chain.js';
import MusaLogo from '../components/MusaLogo.jsx';
import Row from '../components/Row.jsx';

function ProfileScreen({ totals, mineCount, maxDaysRemaining, walletAddress, goldUnit, setGoldUnit, onBack, onLogout, goldPrice, priceSource }) {
  const [paxgBalance, setPaxgBalance] = useState(null);

  useEffect(() => {
    if (!walletAddress) return;
    readPaxgBalance(walletAddress).then(setPaxgBalance).catch(() => setPaxgBalance(null));
  }, [walletAddress]);

  const truncAddr = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : 'No wallet';

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

      <div className="flex-1 overflow-auto scrollable px-6 pb-12">
        {/* Wallet address */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-full border border-app flex items-center justify-center"
            style={{ background: 'rgba(201,169,97,0.08)' }}
          >
            <Wallet size={16} className="text-gold" />
          </div>
          <div>
            <div className="text-xs text-dim">Wallet</div>
            <div className="text-sm font-num text-app">{truncAddr}</div>
          </div>
        </div>

        {/* PAXG balance */}
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-3">PAXG balance</div>
          <div
            className="font-display font-num text-app"
            style={{ fontWeight: 300, fontSize: '36px', lineHeight: '1' }}
          >
            {paxgBalance != null ? formatGold(paxgBalance, goldUnit, 6) : '—'}
            <span className="text-lg text-dim ml-2" style={{ fontFamily: "'Fraunces', serif" }}>{goldUnitLabel(goldUnit)}</span>
          </div>
          {paxgBalance != null && (
            <div className="text-xs text-dim font-num mt-2">{formatUSD(paxgBalance * goldPrice)}</div>
          )}
        </div>

        {/* Stats */}
        <div className="bg-surface border border-app rounded-2xl p-5 space-y-2.5 mb-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-3">Mining stats</div>
          <Row label="Active mines" value={`${mineCount}`} />
          <Row label="Total mined" value={`${formatGold(totals.totalGrams, goldUnit, 6)}${goldUnitLabel(goldUnit)}`} />
          <Row label="Claimed" value={`${formatGold(totals.totalClaimed, goldUnit, 6)}${goldUnitLabel(goldUnit)}`} />
          <Row label="Pending" value={`${formatGold(totals.pendingGrams, goldUnit, 3)}${goldUnitLabel(goldUnit)}`} />
          {maxDaysRemaining > 0 && (
            <Row label="Full vest" value={`${Math.ceil(maxDaysRemaining)} days`} />
          )}
        </div>

        {/* Gold price */}
        <div className="bg-surface border border-app rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-2">Gold price</div>
              <div className="text-lg font-num text-app">
                {goldUnit === 'oz'
                  ? `$${(goldPrice * GRAMS_PER_TROY_OZ).toFixed(2)}/oz`
                  : `$${goldPrice.toFixed(2)}/g`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: priceSource === 'live' ? 'var(--gold)' : 'var(--text-dim)' }}
              />
              <span className="text-[9px] text-dim uppercase tracking-widest">
                {priceSource === 'live' ? 'Live' : 'Default'}
              </span>
            </div>
          </div>
        </div>

        {/* g / oz toggle */}
        <div className="bg-surface border border-app rounded-2xl p-5 mb-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-3">Display unit</div>
          <div className="flex gap-2">
            <button
              onClick={() => setGoldUnit('g')}
              className={`press-soft flex-1 h-10 rounded-full text-sm font-num border ${
                goldUnit === 'g' ? 'bg-gold text-black border-gold' : 'border-app text-dim'
              }`}
            >
              Grams (g)
            </button>
            <button
              onClick={() => setGoldUnit('oz')}
              className={`press-soft flex-1 h-10 rounded-full text-sm font-num border ${
                goldUnit === 'oz' ? 'bg-gold text-black border-gold' : 'border-app text-dim'
              }`}
            >
              Troy oz
            </button>
          </div>
        </div>

        {/* Future action buttons (withdraw, swap) go here */}

        {/* Logout */}
        <button
          onClick={onLogout}
          className="press w-full h-12 rounded-full border border-app text-dim text-xs font-medium tracking-wide"
        >
          Log out
        </button>
      </div>
    </div>
  );
}

export default ProfileScreen;

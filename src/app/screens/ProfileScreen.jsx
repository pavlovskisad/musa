import React, { useState, useEffect } from 'react';
import { ArrowLeft, Wallet, Copy, Check } from 'lucide-react';
import { useGold } from '../context/GoldContext.jsx';
import { formatGold, goldUnitLabel, formatUSD, GRAMS_PER_TROY_OZ } from '../lib/gold.js';
import { readPaxgBalance, readSolvencyRatio, readReserveBalance, readTotalOutstandingGrams } from '../lib/chain.js';
import MusaLogo from '../components/MusaLogo.jsx';
import Row from '../components/Row.jsx';

const formatSignedUSD = (v) => `${v >= 0 ? '+' : '−'}${formatUSD(Math.abs(v))}`;

function ProfileScreen({ totals, mineCount, maxDaysRemaining, walletAddress, goldUnit, setGoldUnit, onBack, onLogout, onResetAll, goldPrice, priceSource }) {
  const [paxgBalance, setPaxgBalance] = useState(null);
  const [solvency, setSolvency] = useState(null);
  const [reserveBalance, setReserveBalance] = useState(null);
  const [outstandingGrams, setOutstandingGrams] = useState(null);
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!walletAddress) return;
    readPaxgBalance(walletAddress).then(setPaxgBalance).catch(() => setPaxgBalance(null));
  }, [walletAddress]);

  useEffect(() => {
    let cancelled = false;
    const fetchAll = () => {
      readSolvencyRatio()
        .then(r => { if (!cancelled) setSolvency(r); })
        .catch(() => { if (!cancelled) setSolvency(null); });
      readReserveBalance()
        .then(r => { if (!cancelled) setReserveBalance(r); })
        .catch(() => {});
      readTotalOutstandingGrams()
        .then(r => { if (!cancelled) setOutstandingGrams(r); })
        .catch(() => {});
    };
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const hasInvestment = totals.totalInvested > 0;
  const minedPnLPct = totals.minedPnL && totals.totalInvested > 0
    ? (totals.minedPnL / totals.totalInvested) * 100
    : 0;
  const fullyVestedPnLPct = totals.fullyVestedPnL && totals.totalInvested > 0
    ? (totals.fullyVestedPnL / totals.totalInvested) * 100
    : 0;

  // Solvency: 1.0 = 100%. Cap visual at 1.5 (150%) — anything above that pegs full.
  const solvencyPct = solvency != null && Number.isFinite(solvency) ? solvency * 100 : null;
  const solvencyBarWidth = solvency != null
    ? Math.min(100, Math.max(0, (solvency / 1.5) * 100))
    : 0;
  const solvencyHealthy = solvency != null && solvency >= 1;

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
        <button onClick={copyAddress} className="press flex items-center gap-3 mb-6 w-full text-left">
          <div
            className="w-10 h-10 rounded-full border border-app flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(201,169,97,0.08)' }}
          >
            <Wallet size={16} className="text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-dim">Wallet</div>
            <div className="text-sm font-num text-app">{truncAddr}</div>
          </div>
          {copied
            ? <Check size={14} className="text-gold flex-shrink-0" />
            : <Copy size={14} className="text-dim flex-shrink-0" />
          }
        </button>

        {/* PAXG balance */}
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-3">PAXG balance</div>
          <div
            className="font-display font-num text-app"
            style={{ fontWeight: 300, fontSize: '36px', lineHeight: '1' }}
          >
            {paxgBalance != null ? paxgBalance.toFixed(6) : '—'}
            <span className="text-lg text-dim ml-2" style={{ fontFamily: "'Fraunces', serif" }}>PAXG</span>
          </div>
          {paxgBalance != null && (
            <div className="text-xs text-dim font-num mt-2">{formatUSD(paxgBalance * goldPrice * GRAMS_PER_TROY_OZ)}</div>
          )}
        </div>

        {/* Investment */}
        {hasInvestment && (
          <div className="bg-surface border border-app rounded-2xl p-5 space-y-2.5 mb-6">
            <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-3">Investment</div>
            <Row label="Total invested" value={formatUSD(totals.totalInvested)} />
            <Row
              label="Mined value"
              value={
                <span>
                  <span className="text-app">{formatUSD(totals.totalGrams * goldPrice)}</span>
                  <span className={`ml-2 text-xs ${totals.minedPnL >= 0 ? 'text-gold' : 'text-dim'}`}>
                    {formatSignedUSD(totals.minedPnL)} ({minedPnLPct >= 0 ? '+' : ''}{minedPnLPct.toFixed(1)}%)
                  </span>
                </span>
              }
            />
            <Row
              label="Fully vested"
              value={
                <span>
                  <span className="text-app">{formatUSD(totals.fullyVestedValueUSD)}</span>
                  <span className={`ml-2 text-xs ${totals.fullyVestedPnL >= 0 ? 'text-gold' : 'text-dim'}`}>
                    {formatSignedUSD(totals.fullyVestedPnL)} ({fullyVestedPnLPct >= 0 ? '+' : ''}{fullyVestedPnLPct.toFixed(1)}%)
                  </span>
                </span>
              }
            />
          </div>
        )}

        {/* Solvency */}
        <div className="bg-surface border border-app rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-[0.3em] text-dim">Reserve solvency</div>
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: solvency == null ? 'var(--text-dim)' : solvencyHealthy ? 'var(--gold)' : '#d97757',
                }}
              />
              <span className="text-[9px] text-dim uppercase tracking-widest">
                {solvency == null ? 'Loading' : solvencyHealthy ? 'Healthy' : 'Underfunded'}
              </span>
            </div>
          </div>
          <div className="text-lg font-num text-app mb-3">
            {solvency == null
              ? '—'
              : solvency > 100
                ? '∞'
                : `${solvencyPct.toFixed(1)}%`}
          </div>
          <div className="relative h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full"
              style={{
                width: `${solvencyBarWidth}%`,
                background: solvencyHealthy ? 'var(--gold)' : '#d97757',
                transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </div>
          {reserveBalance != null && outstandingGrams != null && (
            <div className="flex items-center justify-between mt-3 text-[10px] font-num">
              <span className="text-dim">
                Reserve <span className="text-app">{(reserveBalance * GRAMS_PER_TROY_OZ).toFixed(2)}</span>g
              </span>
              <span className="text-dim">
                Owed <span className="text-app">{outstandingGrams.toFixed(2)}</span>g
              </span>
            </div>
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
          className="press w-full h-12 rounded-full border border-app text-dim text-xs font-medium tracking-wide mb-3"
        >
          Log out
        </button>

        {/* Reset all data — for resetting after contract redeploys */}
        {onResetAll && (
          <button
            onClick={() => {
              if (confirm('Wipe all mines and start fresh? This clears your local data and database records. On-chain positions remain.')) {
                onResetAll();
              }
            }}
            className="press w-full h-12 rounded-full border border-app text-dim text-xs font-medium tracking-wide"
            style={{ borderColor: 'rgba(217, 119, 87, 0.3)', color: '#d97757' }}
          >
            Reset all data
          </button>
        )}
      </div>
    </div>
  );
}

export default ProfileScreen;

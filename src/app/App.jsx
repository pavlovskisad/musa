import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePrivy, useSendTransaction } from '@privy-io/react-auth';

import './styles/app.css';

import { TIERS } from './lib/tiers.js';
import { formatGold, formatUSD } from './lib/gold.js';
import { computeUnit, getExitPenaltyPct } from './lib/unit.js';
import { loadUnits, saveUnits, clearAll, setStorageUserId, setAccessToken, fetchUnits, createUnit, exitUnit as exitUnitApi } from './lib/storage.js';
import { claimPosition, exitPositionEarly } from './lib/chain.js';

import { GoldContext } from './context/GoldContext.jsx';
import { useGoldPrice } from './hooks/useGoldPrice.js';
import { useSimTime } from './hooks/useSimTime.js';

import DevStrip from './components/DevStrip.jsx';
import CreationOverlay from './components/CreationOverlay.jsx';
import CelebrationOverlay from './components/CelebrationOverlay.jsx';

import OnboardingScreen from './screens/OnboardingScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import BrowseScreen from './screens/BrowseScreen.jsx';
import BuyScreen from './screens/BuyScreen.jsx';
import UnitDetailScreen from './screens/UnitDetailScreen.jsx';
import ExitScreen from './screens/ExitScreen.jsx';

export default function App() {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const { sendTransaction } = useSendTransaction();

  const userName = user?.email?.address?.split('@')[0] || null;

  const [timeMult, setTimeMult] = useState(1);
  const { simTime, setSimTime } = useSimTime(timeMult);
  const { goldPrice, setGoldPrice, priceSource, setPriceSource } = useGoldPrice();
  const [goldUnit, setGoldUnit] = useState('g');

  const [screen, setScreen] = useState(() => 'onboarding');
  const [devOpen, setDevOpen] = useState(false);
  const [units, setUnits] = useState(() => loadUnits());
  const [selectedTier, setSelectedTier] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(100);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [recentlyPurchased, setRecentlyPurchased] = useState(null);
  const [creating, setCreating] = useState(null);
  const [celebratingUnit, setCelebratingUnit] = useState(null);
  const celebratedIdsRef = useRef(new Set());

  // On auth: set user ID, get token, fetch units from API
  useEffect(() => {
    if (!ready) return;
    if (authenticated && user) {
      setStorageUserId(user.id);
      getAccessToken().then(token => {
        if (token) setAccessToken(token);
        fetchUnits().then(u => setUnits(u));
      });
      if (screen === 'onboarding') setScreen('home');
    }
  }, [ready, authenticated, user]);

  // Persist units to localStorage on change
  useEffect(() => { saveUnits(units); }, [units]);

  const computedUnits = useMemo(
    () => units.map(u => computeUnit(u, simTime)),
    [units, simTime]
  );

  const totals = useMemo(() => {
    const totalGrams = computedUnits.reduce((s, u) => s + (u.gramsDelivered || 0), 0);
    const pendingGrams = computedUnits
      .filter(u => u.computedStatus !== 'exited' && u.computedStatus !== 'completed')
      .reduce((s, u) => s + (u.gramsTotal - (u.gramsDelivered || 0)), 0);
    const totalValueUSD = totalGrams * goldPrice;
    return { totalGrams, pendingGrams, totalValueUSD };
  }, [computedUnits, goldPrice]);

  const visibleUnits = computedUnits
    .filter(u => u.computedStatus !== 'exited')
    .sort((a, b) => {
      const aDone = a.computedStatus === 'completed' ? 1 : 0;
      const bDone = b.computedStatus === 'completed' ? 1 : 0;
      return aDone - bDone;
    });

  useEffect(() => {
    if (celebratingUnit) return;
    for (const u of computedUnits) {
      if (u.computedStatus === 'completed' && !celebratedIdsRef.current.has(u.id)) {
        celebratedIdsRef.current.add(u.id);
        setCelebratingUnit(u);
        break;
      }
    }
  }, [computedUnits, celebratingUnit]);

  const startBuy = async (tierId, amount) => {
    setCreating({ tierId, amount });
    const tier = TIERS[tierId];
    const faceValue = amount * (1 + tier.discount);
    const grams = faceValue / goldPrice;
    const unit = {
      id: Math.random().toString(36).slice(2, 9),
      tier: tierId,
      pricePaid: amount,
      faceValue,
      gramsTotal: grams,
      goldPriceAtPurchase: goldPrice,
      purchasedAt: simTime.getTime(),
      exitedAt: null,
    };
    // Optimistic UI — show immediately while on-chain tx confirms
    setUnits(prev => [unit, ...prev]);
    const result = await createUnit(unit);
    if (result?.positionId != null) {
      setUnits(prev => prev.map(u =>
        u.id === unit.id
          ? { ...u, positionId: result.positionId, txHash: result.txHash, walletAddress: result.walletAddress }
          : u
      ));
    }
    setRecentlyPurchased(unit.id);
    setCreating(null);
    setScreen('home');
    setTimeout(() => setRecentlyPurchased(null), 2500);
  };

  const claimUnit = async (unitId) => {
    const unit = units.find(u => u.id === unitId);
    if (!unit || unit.positionId == null) return;
    try {
      await claimPosition(sendTransaction, unit.positionId);
      fetchUnits().then(u => setUnits(u));
    } catch (err) {
      console.error('Claim failed:', err);
    }
  };

  const exitUnit = async (unitId) => {
    const unit = computedUnits.find(u => u.id === unitId);
    if (!unit || unit.positionId == null) return;
    try {
      await exitPositionEarly(sendTransaction, unit.positionId);
      const exitTime = simTime.getTime();
      const pctElapsed = unit.deliveryElapsed ? unit.deliveryElapsed / unit.deliveryDays : 0;
      const penaltyPct = getExitPenaltyPct(pctElapsed);
      const undeliveredGrams = Math.max(0, unit.gramsTotal - unit.gramsDelivered);
      const refundGrams = undeliveredGrams * (1 - penaltyPct);
      const totalReceived = unit.gramsDelivered + refundGrams;

      setUnits(prev => prev.map(u =>
        u.id === unitId ? { ...u, exitedAt: exitTime, gramsAtExit: totalReceived } : u
      ));
      exitUnitApi(unitId, exitTime, totalReceived);
      setScreen('home');
    } catch (err) {
      console.error('Exit failed:', err);
    }
  };

  const resetAll = () => {
    setUnits([]);
    clearAll();
    setSimTime(new Date());
    setScreen('onboarding');
    setSelectedUnitId(null);
    setSelectedTier(null);
    setSelectedAmount(100);
    setCreating(null);
    logout();
  };

  const selectedUnit = computedUnits.find(u => u.id === selectedUnitId);

  return (
    <GoldContext.Provider value={{ price: goldPrice, unit: goldUnit, priceSource }}>
    <div
      className="w-full flex items-center justify-center p-4"
      style={{ background: '#0a0908', minHeight: '100dvh' }}
    >
      <div className="relative" style={{ width: '390px', height: '844px', maxHeight: '95dvh' }}>
        <div
          className="absolute inset-0 rounded-[44px] overflow-hidden phone-frame flex flex-col"
          style={{ background: 'var(--bg)', color: 'var(--text)' }}
        >
          {devOpen && (
            <>
              <div
                className="absolute inset-0 z-40"
                style={{ background: 'rgba(0,0,0,0.4)' }}
                onClick={() => setDevOpen(false)}
              />
              <div className="absolute top-0 left-0 right-0 z-50 anim-slide-down">
                <DevStrip
                  timeMult={timeMult}
                  setTimeMult={setTimeMult}
                  simTime={simTime}
                  onReset={resetAll}
                  goldUnit={goldUnit}
                  setGoldUnit={setGoldUnit}
                  goldPrice={goldPrice}
                  priceSource={priceSource}
                />
              </div>
            </>
          )}

          <div className="flex-1 relative overflow-hidden">
            {screen === 'onboarding' && (
              <OnboardingScreen
                key="onboarding"
                onContinue={authenticated ? () => setScreen('home') : login}
              />
            )}
            {screen === 'home' && (
              <HomeScreen
                key="home"
                units={visibleUnits}
                totals={totals}
                recentlyPurchased={recentlyPurchased}
                userName={userName}
                onBuy={() => setScreen('browse')}
                onHome={() => setScreen('onboarding')}
                onSettings={() => setDevOpen(v => !v)}
                onUnit={(id) => { setSelectedUnitId(id); setScreen('unitDetail'); }}
              />
            )}
            {screen === 'browse' && (
              <BrowseScreen
                key="browse"
                onBack={() => setScreen('home')}
                onHome={() => setScreen('onboarding')}
                onSelect={(tierId) => { setSelectedTier(tierId); setScreen('buy'); }}
              />
            )}
            {screen === 'buy' && selectedTier && (
              <BuyScreen
                key="buy"
                tierId={selectedTier}
                amount={selectedAmount}
                setAmount={setSelectedAmount}
                onBack={() => setScreen('browse')}
                onHome={() => setScreen('onboarding')}
                onConfirm={() => startBuy(selectedTier, selectedAmount)}
              />
            )}
            {screen === 'unitDetail' && selectedUnit && (
              <UnitDetailScreen
                key={`unitDetail-${selectedUnitId}`}
                unit={selectedUnit}
                onBack={() => setScreen('home')}
                onHome={() => setScreen('onboarding')}
                onExit={() => setScreen('exit')}
                onClaim={() => claimUnit(selectedUnitId)}
              />
            )}
            {screen === 'exit' && selectedUnit && (
              <ExitScreen
                key="exit"
                unit={selectedUnit}
                onBack={() => setScreen('unitDetail')}
                onHome={() => setScreen('onboarding')}
                onConfirm={() => exitUnit(selectedUnitId)}
              />
            )}

            {creating && <CreationOverlay tierId={creating.tierId} amount={creating.amount} />}
            {celebratingUnit && (
              <CelebrationOverlay
                unit={celebratingUnit}
                onDismiss={() => setCelebratingUnit(null)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
    </GoldContext.Provider>
  );
}

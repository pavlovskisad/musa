import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePrivy, useSendTransaction, useWallets, useCreateWallet } from '@privy-io/react-auth';

import './styles/app.css';

import { TIERS } from './lib/tiers.js';
import { formatGold, formatUSD } from './lib/gold.js';
import { computeUnit, getExitPenaltyPct } from './lib/unit.js';
import { loadUnits, saveUnits, setStorageUserId, setAccessToken, fetchUnits, createUnit, exitUnit as exitUnitApi, claimUnit as claimUnitApi, clearAll } from './lib/storage.js';
import { claimPosition, claimAllPositions, exitPositionEarly } from './lib/chain.js';

import { GoldContext } from './context/GoldContext.jsx';
import { useGoldPrice } from './hooks/useGoldPrice.js';
import { useSimTime } from './hooks/useSimTime.js';

import CreationOverlay from './components/CreationOverlay.jsx';
import CelebrationOverlay from './components/CelebrationOverlay.jsx';

import OnboardingScreen from './screens/OnboardingScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import BrowseScreen from './screens/BrowseScreen.jsx';
import BuyScreen from './screens/BuyScreen.jsx';
import UnitDetailScreen from './screens/UnitDetailScreen.jsx';
import ExitScreen from './screens/ExitScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';

export default function App() {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const { sendTransaction } = useSendTransaction();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');

  const userName = user?.email?.address?.split('@')[0] || null;

  const { simTime } = useSimTime(1);
  const { goldPrice, priceSource } = useGoldPrice();
  const [goldUnit, setGoldUnit] = useState('g');

  const [screen, setScreen] = useState(() => 'onboarding');
  const [units, setUnits] = useState(() => loadUnits());
  const [selectedTier, setSelectedTier] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(100);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [recentlyPurchased, setRecentlyPurchased] = useState(null);
  const [creating, setCreating] = useState(null);
  const [celebratingUnit, setCelebratingUnit] = useState(null);
  const celebratedIdsRef = useRef(new Set());

  // On auth: set user ID, get token, ensure wallet exists, fetch units
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

  // Ensure embedded wallet exists — createOnLogin doesn't always fire
  useEffect(() => {
    if (!ready || !authenticated || embeddedWallet) return;
    createWallet().catch(() => {});
  }, [ready, authenticated, embeddedWallet]);

  // Persist units to localStorage on change
  useEffect(() => { saveUnits(units); }, [units]);

  const computedUnits = useMemo(
    () => units.map(u => computeUnit(u, simTime)),
    [units, simTime]
  );

  const totals = useMemo(() => {
    const totalGrams = computedUnits.reduce((s, u) => s + (u.gramsDelivered || 0), 0);
    const totalClaimed = computedUnits.reduce((s, u) => s + (u.gramsClaimed || 0), 0);
    const pendingGrams = computedUnits
      .filter(u => u.computedStatus !== 'exited' && u.computedStatus !== 'completed')
      .reduce((s, u) => s + (u.gramsTotal - (u.gramsDelivered || 0)), 0);
    const totalClaimable = computedUnits
      .filter(u => u.computedStatus !== 'exited' && u.positionId != null)
      .reduce((s, u) => s + Math.max(0, (u.gramsDelivered || 0) - (u.gramsClaimed || 0)), 0);
    const totalValueUSD = totalGrams * goldPrice;
    const totalInvested = computedUnits
      .filter(u => u.computedStatus !== 'exited')
      .reduce((s, u) => s + (u.pricePaid || 0), 0);
    const totalGramsCommitted = computedUnits
      .filter(u => u.computedStatus !== 'exited')
      .reduce((s, u) => s + (u.gramsTotal || 0), 0);
    const fullyVestedValueUSD = totalGramsCommitted * goldPrice;
    const minedValueUSD = totalGrams * goldPrice;
    const minedCostBasis = computedUnits
      .filter(u => u.computedStatus !== 'exited' && u.gramsTotal > 0)
      .reduce((s, u) => s + (u.pricePaid || 0) * ((u.gramsDelivered || 0) / u.gramsTotal), 0);
    const fullyVestedPnL = fullyVestedValueUSD - totalInvested;
    const minedPnL = minedValueUSD - minedCostBasis;
    const maxDaysRemaining = computedUnits
      .filter(u => u.computedStatus === 'active' || u.computedStatus === 'constructing')
      .reduce((m, u) => Math.max(m, u.daysRemaining || 0), 0);
    const mineCount = computedUnits.filter(u => u.computedStatus !== 'exited').length;
    return {
      totalGrams, totalClaimed, totalClaimable, pendingGrams, totalValueUSD,
      totalInvested, totalGramsCommitted, fullyVestedValueUSD, fullyVestedPnL, minedPnL,
      maxDaysRemaining, mineCount,
    };
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
    // Pass wallet address from frontend so backend has a fallback
    if (embeddedWallet?.address) unit.walletAddress = embeddedWallet.address;
    // Optimistic UI — show immediately while on-chain tx confirms
    setUnits(prev => [unit, ...prev]);
    const result = await createUnit(unit);
    if (result?.ok && result.positionId != null) {
      setUnits(prev => prev.map(u =>
        u.id === unit.id
          ? { ...u, positionId: result.positionId, txHash: result.txHash, walletAddress: result.walletAddress }
          : u
      ));
      setRecentlyPurchased(unit.id);
    } else if (!result?.ok) {
      // Backend rejected the buy — roll back the optimistic unit so localStorage
      // doesn't get stranded with a unit that doesn't exist on-chain / in DB.
      setUnits(prev => prev.filter(u => u.id !== unit.id));
      console.error('Buy failed:', result?.error, result?.detail);
      alert(`Buy failed: ${result?.error || 'Unknown error'}${result?.detail ? `\n\n${result.detail}` : ''}`);
    }
    setCreating(null);
    setScreen('home');
    setTimeout(() => setRecentlyPurchased(null), 2500);
  };

  const claimUnit = async (unitId) => {
    const computed = computedUnits.find(u => u.id === unitId);
    if (!computed || computed.positionId == null) return;
    const claimable = Math.max(0, (computed.gramsDelivered || 0) - (computed.gramsClaimed || 0));
    if (claimable < 1e-9) return;
    try {
      await claimPosition(sendTransaction, computed.positionId);
      setUnits(prev => prev.map(u =>
        u.id === unitId ? { ...u, gramsClaimed: (u.gramsClaimed || 0) + claimable } : u
      ));
      claimUnitApi(unitId, claimable);
    } catch (err) {
      console.error('Claim failed:', err);
    }
  };

  const claimAll = async () => {
    const claimable = computedUnits.filter(u =>
      u.computedStatus !== 'exited' && u.positionId != null &&
      (u.gramsDelivered || 0) - (u.gramsClaimed || 0) > 1e-9
    );
    if (claimable.length === 0) return;

    const positionIds = claimable.map(u => u.positionId);
    try {
      await claimAllPositions(sendTransaction, positionIds);
      for (const unit of claimable) {
        const amount = (unit.gramsDelivered || 0) - (unit.gramsClaimed || 0);
        setUnits(prev => prev.map(u =>
          u.id === unit.id ? { ...u, gramsClaimed: (u.gramsClaimed || 0) + amount } : u
        ));
        claimUnitApi(unit.id, amount);
      }
    } catch (err) {
      console.error('Claim all failed:', err);
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

      // Contract transfers vested + refund - previouslyClaimed in one shot,
      // so mark all delivered gold as claimed too.
      const newClaimed = unit.gramsDelivered - (unit.gramsClaimed || 0);

      setUnits(prev => prev.map(u =>
        u.id === unitId ? { ...u, exitedAt: exitTime, gramsAtExit: totalReceived, gramsClaimed: (u.gramsClaimed || 0) + newClaimed } : u
      ));
      exitUnitApi(unitId, exitTime, totalReceived);
      if (newClaimed > 0) claimUnitApi(unitId, newClaimed);
      setScreen('home');
    } catch (err) {
      console.error('Exit failed:', err);
    }
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
                onProfile={() => setScreen('profile')}
                onClaimAll={claimAll}
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

            {screen === 'profile' && (
              <ProfileScreen
                key="profile"
                totals={totals}
                mineCount={totals.mineCount}
                maxDaysRemaining={totals.maxDaysRemaining}
                walletAddress={embeddedWallet?.address}
                goldUnit={goldUnit}
                setGoldUnit={setGoldUnit}
                goldPrice={goldPrice}
                priceSource={priceSource}
                onBack={() => setScreen('home')}
                onLogout={() => { logout(); setScreen('onboarding'); }}
                onResetAll={async () => {
                  await clearAll();
                  setUnits([]);
                  setScreen('home');
                }}
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

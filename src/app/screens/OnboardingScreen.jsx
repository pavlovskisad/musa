import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

function OnboardingScreen({ onContinue }) {
  const [splashActive, setSplashActive] = useState(true);
  const [activeScreen, setActiveScreen] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setSplashActive(false), 3200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollTop / el.clientHeight);
      setActiveScreen(Math.max(0, Math.min(7, idx)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const contentFloated = activeScreen >= 1;

  const singularityRef = useRef(null);
  const fillRef = useRef(null);

  const firstViewportParticles = useMemo(() => {
    const particles = [];
    let seed = 1;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 14; i++) {
      const left = rand() * 100;
      const bottom = rand() * 35;
      const delay = -rand() * 12;
      const sizeRoll = rand();
      const size = sizeRoll < 0.5 ? 1 : sizeRoll < 0.85 ? 1.5 : 2;
      const opacity = 0.4 + rand() * 0.4;
      particles.push({ left, bottom, delay, size, opacity, id: `fv${i}` });
    }
    return particles;
  }, []);

  const loreParticles = useMemo(() => {
    const particles = [];
    let seed = 7;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 18; i++) {
      const left = rand() * 100;
      const bottom = rand() * 100;
      const delay = -rand() * 12;
      const sizeRoll = rand();
      const size = sizeRoll < 0.5 ? 1 : sizeRoll < 0.85 ? 1.5 : 2;
      const opacity = 0.4 + rand() * 0.4;
      particles.push({ left, bottom, delay, size, opacity, id: `l${i}` });
    }
    return particles;
  }, []);

  const connectParticles = useMemo(() => {
    const particles = [];
    let seed = 13;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const COUNT = 400;
    for (let i = 0; i < COUNT; i++) {
      let left;
      const zoneRoll = rand();
      if (zoneRoll < 0.45) {
        left = rand() * 32;
      } else if (zoneRoll < 0.9) {
        left = 68 + rand() * 32;
      } else {
        left = 32 + rand() * 36;
      }
      const dur = 12 + rand() * 8;
      const delay = -rand() * dur;
      const sizeRoll = rand();
      let size, opacity;
      if (sizeRoll < 0.55) {
        size = 1;
        opacity = 0.2 + rand() * 0.25;
      } else if (sizeRoll < 0.88) {
        size = 1.5;
        opacity = 0.45 + rand() * 0.25;
      } else {
        size = 2;
        opacity = 0.6 + rand() * 0.3;
      }
      if (zoneRoll >= 0.9) {
        size = 1;
        opacity = Math.min(opacity, 0.3);
      }
      const drift = (rand() - 0.5) * 30;
      particles.push({ left, dur, delay, size, opacity, drift, id: `r${i}` });
    }
    return particles;
  }, []);

  const connectVortex = useMemo(() => {
    const particles = [];
    let seed = 91;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const COUNT = 48;
    const STOPS = 22;
    const TOTAL_TURNS = 3.2;
    for (let i = 0; i < COUNT; i++) {
      const startAngle = rand() * Math.PI * 2;
      const startRadius = 125 + rand() * 15;
      const totalRotation = Math.PI * 2 * TOTAL_TURNS;
      const dur = 24 + rand() * 6;
      const delay = -rand() * dur;
      const sizeRoll = rand();
      const size = sizeRoll < 0.55 ? 1.5 : sizeRoll < 0.88 ? 2 : 2.5;

      const waypoints = [];
      for (let s = 0; s <= STOPS; s++) {
        const t = s / STOPS;
        let radiusMul;
        if (t < 0.55) {
          radiusMul = 1 - (t / 0.55) * 0.45;
        } else if (t < 0.88) {
          const localT = (t - 0.55) / 0.33;
          radiusMul = 0.55 - localT * 0.40;
        } else {
          const localT = (t - 0.88) / 0.12;
          radiusMul = 0.15 * (1 - Math.pow(localT, 1.8));
        }
        const radius = startRadius * radiusMul;
        const angle = startAngle + totalRotation * t;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        waypoints.push({ pct: t * 100, x, y });
      }
      particles.push({ waypoints, dur, delay, size, id: i });
    }
    return particles;
  }, []);

  const vortexKeyframes = useMemo(() => {
    return connectVortex.map(p => {
      const stops = p.waypoints.map(w => {
        const isLast = w.pct >= 99.99;
        const isFirst = w.pct < 0.01;
        let scale;
        if (isFirst) scale = 0.4;
        else if (isLast) scale = 0.15;
        else if (w.pct >= 92) scale = 0.5;
        else scale = 1;
        let opacity;
        if (isFirst) opacity = 0;
        else if (w.pct < 6) opacity = 0.6;
        else if (w.pct < 92) opacity = 0.9;
        else if (w.pct < 99) opacity = 0.4;
        else opacity = 0;
        return `${w.pct.toFixed(2)}% { transform: translate(${w.x.toFixed(1)}px, ${w.y.toFixed(1)}px) scale(${scale}); opacity: ${opacity}; }`;
      }).join(' ');
      return `@keyframes vortex${p.id} { ${stops} }`;
    }).join('\n');
  }, [connectVortex]);

  const accumData = useMemo(() => {
    const r = Math.pow(1.08, 1 / 12) - 1;
    const pts = [{ m: 0, inv: 0, val: 0, g: 0 }];
    let gold = 0, inv = 0;
    for (let m = 1; m <= 60; m++) {
      const price = 100 * Math.pow(1 + r, m);
      inv += 100;
      gold += 118.8 / price;
      pts.push({ m, inv, val: gold * price, g: gold });
    }
    const last = pts[pts.length - 1];
    const maxY = Math.ceil(last.val / 1000) * 1000;
    const W = 280, H = 130;
    const x = m => (m / 60) * W;
    const y = v => H - (v / maxY) * H;
    const invPath = pts.map((p, i) =>
      `${i === 0 ? 'M' : 'L'}${x(p.m).toFixed(1)},${y(p.inv).toFixed(1)}`
    ).join(' ');
    const valPath = pts.map((p, i) =>
      `${i === 0 ? 'M' : 'L'}${x(p.m).toFixed(1)},${y(p.val).toFixed(1)}`
    ).join(' ');
    const fillPath = pts.map((p, i) =>
      `${i === 0 ? 'M' : 'L'}${x(p.m).toFixed(1)},${y(p.val).toFixed(1)}`
    ).join(' ') + ' ' + [...pts].reverse().map(p =>
      `L${x(p.m).toFixed(1)},${y(p.inv).toFixed(1)}`
    ).join(' ') + ' Z';
    return {
      invPath, valPath, fillPath,
      invEndY: y(last.inv), valEndY: y(last.val),
      invested: last.inv,
      value: last.val,
      gold: last.g,
      returnPct: ((last.val - last.inv) / last.inv * 100),
    };
  }, []);

  const [arcPulse, setArcPulse] = useState(0);
  const mountTimeRef = useRef(performance.now() / 1000);

  useEffect(() => {
    if (activeScreen !== 7) return;

    const CAPTURE_RADIUS = 32;
    const EAT_EVERY = 6;

    let cancelled = false;
    let clearTimer = null;
    let rafId = null;

    const wasInside = new Array(connectVortex.length).fill(false);
    let entryCount = 0;
    let seeded = false;

    const fireEat = () => {
      if (singularityRef.current) {
        singularityRef.current.classList.add('singularity-glow-eat');
      }
      if (fillRef.current) {
        fillRef.current.classList.add('connect-fill-punch');
      }
      setArcPulse(p => p + 1);
      if (clearTimer) clearTimeout(clearTimer);
      clearTimer = setTimeout(() => {
        if (cancelled) return;
        if (singularityRef.current) {
          singularityRef.current.classList.remove('singularity-glow-eat');
        }
        if (fillRef.current) {
          fillRef.current.classList.remove('connect-fill-punch');
        }
      }, 180);
    };

    const tick = () => {
      if (cancelled) return;
      const now = performance.now() / 1000;
      const elapsedFromMount = now - mountTimeRef.current;
      const r2 = CAPTURE_RADIUS * CAPTURE_RADIUS;

      for (let i = 0; i < connectVortex.length; i++) {
        const p = connectVortex[i];
        const particleTime = elapsedFromMount - p.delay;
        const progressPct = ((particleTime % p.dur) / p.dur) * 100;
        const wps = p.waypoints;
        let a = wps[0], b = wps[wps.length - 1];
        for (let j = 0; j < wps.length - 1; j++) {
          if (progressPct >= wps[j].pct && progressPct <= wps[j + 1].pct) {
            a = wps[j]; b = wps[j + 1];
            break;
          }
        }
        const span = b.pct - a.pct;
        const localT = span > 0 ? (progressPct - a.pct) / span : 0;
        const x = a.x + (b.x - a.x) * localT;
        const y = a.y + (b.y - a.y) * localT;
        const inside = (x * x + y * y) < r2;

        if (!seeded) {
          wasInside[i] = inside;
        } else if (inside && !wasInside[i]) {
          entryCount++;
          if (entryCount >= EAT_EVERY) {
            fireEat();
            entryCount = 0;
          }
          wasInside[i] = true;
        } else if (!inside && wasInside[i]) {
          wasInside[i] = false;
        }
      }
      seeded = true;
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (clearTimer) clearTimeout(clearTimer);
      if (singularityRef.current) {
        singularityRef.current.classList.remove('singularity-glow-eat');
      }
      if (fillRef.current) {
        fillRef.current.classList.remove('connect-fill-punch');
      }
    };
  }, [activeScreen, connectVortex]);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto overflow-x-hidden scrollable anim-fade"
      style={{
        background: '#0a0908',
        scrollSnapType: 'y mandatory',
        scrollBehavior: 'smooth',
      }}
    >
      {/* === DOT PAGINATION === */}
      <div
        className="onboard-dots"
        style={{
          position: 'fixed',
          right: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
          <span
            key={i}
            className="onboard-dot"
            style={{
              width: activeScreen === i ? '6px' : '4px',
              height: activeScreen === i ? '6px' : '4px',
              borderRadius: '50%',
              background: activeScreen === i ? '#c9a961' : 'rgba(232, 218, 188, 0.25)',
              transition: 'all 0.4s ease-out',
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* === SPLASH OVERLAY === */}
      {splashActive && (
        <div
          className="absolute inset-0"
          style={{
            zIndex: 50,
            background: '#0a0908',
            animation: 'splashFadeOut 0.8s ease-out 2.4s forwards',
          }}
        >
          <div className="splash-glow" />
          <div className="splash-dot" />
        </div>
      )}

      {/* === SCREEN 1 — Mine real gold === */}
      <div
        className="h-full flex flex-col relative"
        style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {firstViewportParticles.map(p => (
            <span
              key={p.id}
              className="particle particle-drift"
              style={{
                left: `${p.left}%`,
                bottom: `${p.bottom}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="px-6 pt-4 pb-2 flex justify-center onboard-label-in" style={{ zIndex: 4 }}>
          <button
            onClick={() => { window.location.hash = '#/'; }}
            className="press"
            style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit' }}
          >
            <div className="text-[10px] uppercase tracking-[0.4em] musa-logo">
              <span className="musa-logo-text">musa</span>
              <span className="musa-logo-shimmer">musa</span>
            </div>
          </button>
        </div>

        <div className="relative px-8 pt-14" style={{ zIndex: 4 }}>
          <h1
            className="font-display text-app mb-6 onboard-headline-in"
            style={{ fontWeight: 300, fontSize: '64px', lineHeight: '0.92' }}
          >
            Mine real
            <br />
            <span className="italic text-gold" style={{ fontWeight: 400 }}>
              gold
            </span>
          </h1>
          <p className="text-dim text-sm leading-relaxed max-w-[280px] onboard-subtitle-in">
            Forward purchase contracts on physical gold from working mines. Delivered to your wallet, gram by gram, as it's mined.
          </p>
        </div>

        <div className="flex-1" />

        <div className={`pb-8 relative snap-button ${activeScreen === 0 ? 'snap-button-in' : 'snap-button-hidden'}`} style={{ zIndex: 4 }}>
          <button
            onClick={onContinue}
            className="press w-full h-14 rounded-full bg-gold text-black font-medium tracking-wide flex items-center justify-center gap-2"
          >
            Begin
            <ChevronRight size={18} />
          </button>
          <p className="text-center text-[11px] text-dim mt-5">
            Real gold · real mines · delivered
          </p>
        </div>

        <div className={`scroll-hint ${activeScreen > 0 ? 'hidden' : ''}`}>
          <div className="text-[9px] uppercase tracking-[0.3em] text-dim mb-1">more</div>
          <ChevronDown size={16} strokeWidth={1.25} className="text-dim" />
        </div>
      </div>

      {/* === SCREEN 2 — Lore === */}
      <div
        className="h-full flex flex-col px-8 pt-20 relative overflow-hidden"
        style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
      >
        <div
          className={`radar-stage ${activeScreen === 1 ? 'radar-on' : ''}`}
          style={{
            position: 'absolute',
            left: '50%',
            top: '68%',
            zIndex: 1,
          }}
        >
          {[
            { size: 80,  delay: 0.0 },
            { size: 180, delay: 0.5 },
            { size: 320, delay: 1.0 },
            { size: 500, delay: 1.5 },
            { size: 720, delay: 2.0 },
            { size: 980, delay: 2.5 },
          ].map((r, i) => (
            <span
              key={i}
              className="radar-ring"
              style={{
                width: `${r.size}px`,
                height: `${r.size}px`,
                marginLeft: `-${r.size / 2}px`,
                marginTop: `-${r.size / 2}px`,
                animationDelay: `${r.delay}s`,
              }}
            />
          ))}
          <span className="radar-center" />
        </div>

        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {loreParticles.map(p => (
            <span
              key={p.id}
              className="particle particle-drift"
              style={{
                left: `${p.left}%`,
                bottom: `${p.bottom}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="relative" style={{ zIndex: 4 }}>
          <h2
            className="font-display text-app mb-6"
            style={{ fontWeight: 300, fontSize: '52px', lineHeight: '0.95' }}
          >
            the richest
            <br />
            <span className="italic text-gold" style={{ fontWeight: 400 }}>
              man in history
            </span>
          </h2>
          <div className={`text-dim text-[13px] leading-relaxed italic mb-5 font-display float-lore-q ${contentFloated ? 'floated-lore-q' : ''}`} style={{ fontWeight: 300 }}>
            did you know that Musa is claimed to be the richest man in history?
          </div>

          <div className={`text-app text-[13px] leading-relaxed font-display float-lore-a ${contentFloated ? 'floated-lore-a' : ''}`} style={{ fontWeight: 300 }}>
            Ha — yes, Mansa Musa, 14th century emperor of Mali. The one who made his pilgrimage to Mecca in 1324 and distributed so much gold along the way that he reportedly crashed the price of gold across the entire Mediterranean and Middle East for over a decade. Cairo's economy allegedly didn't recover for 12 years.
          </div>
        </div>

        <div className="flex-1" />

      </div>

      {/* === SCREEN 3 — Better than money === */}
      <div
        className="h-full flex flex-col px-8 pt-20 relative"
        style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {firstViewportParticles.slice(0, 10).map(p => (
            <span
              key={`btm-${p.id}`}
              className="particle particle-drift"
              style={{
                left: `${p.left}%`,
                bottom: `${p.bottom}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="relative" style={{ zIndex: 4 }}>
          <h2
            className="font-display text-app"
            style={{ fontWeight: 300, fontSize: '52px', lineHeight: '0.95' }}
          >
            better than
            <br />
            <span className="italic text-gold" style={{ fontWeight: 400 }}>
              money
            </span>
          </h2>
          <p className="text-dim text-[13px] leading-relaxed mt-4 font-display italic" style={{ fontWeight: 300 }}>
            $1 in 1971 buys 4¢ of gold today
          </p>
        </div>

        <div className="flex-1" />

        <div className="relative" style={{ zIndex: 4, height: '180px' }}>
          <svg
            viewBox="0 0 320 160"
            preserveAspectRatio="none"
            style={{ width: '100%', height: '100%' }}
          >
            <line
              x1="0" y1="80" x2="320" y2="80"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
              strokeDasharray="2 4"
              style={{
                opacity: activeScreen === 2 ? 1 : 0,
                transition: 'opacity 0.6s ease-out 0.0s',
              }}
            />
            <path
              d="M 4 36 C 80 50, 140 90, 200 120 S 280 142, 316 148"
              fill="none"
              stroke="rgba(180,180,170,0.4)"
              strokeWidth="1.25"
              strokeLinecap="round"
              style={{
                strokeDasharray: 420,
                strokeDashoffset: activeScreen === 2 ? 0 : 420,
                transition: 'stroke-dashoffset 1.6s cubic-bezier(0.4, 0.6, 0.3, 1) 0.6s',
              }}
            />
            <path
              d="M 4 130 C 80 122, 140 95, 200 60 S 280 22, 316 14"
              fill="none"
              stroke="#C9A961"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={{
                strokeDasharray: 420,
                strokeDashoffset: activeScreen === 2 ? 0 : 420,
                transition: 'stroke-dashoffset 1.6s cubic-bezier(0.4, 0.6, 0.3, 1) 0.2s',
              }}
            />
            <text
              x="4" y="158"
              fill="rgba(255,255,255,0.25)"
              fontSize="8"
              fontFamily="'Geist Mono', monospace"
              style={{
                opacity: activeScreen === 2 ? 1 : 0,
                transition: 'opacity 0.5s ease-out 1.6s',
              }}
            >1971</text>
            <text
              x="316" y="158"
              textAnchor="end"
              fill="rgba(255,255,255,0.25)"
              fontSize="8"
              fontFamily="'Geist Mono', monospace"
              style={{
                opacity: activeScreen === 2 ? 1 : 0,
                transition: 'opacity 0.5s ease-out 1.7s',
              }}
            >2024</text>
          </svg>
        </div>

        <div className="flex-1" />

      </div>

      {/* === SCREEN 4 — From mine to your wallet === */}
      <div
        className="h-full flex flex-col px-8 pt-20 relative overflow-hidden"
        style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
      >
        <div className="relative" style={{ zIndex: 4 }}>
          <h2
            className="font-display text-app"
            style={{ fontWeight: 300, fontSize: '52px', lineHeight: '0.95' }}
          >
            from mine
            <br />
            <span className="italic text-gold" style={{ fontWeight: 400 }}>
              to your wallet
            </span>
          </h2>
          <p className="text-dim text-[13px] leading-relaxed mt-4 font-display italic" style={{ fontWeight: 300 }}>
            directly, gram by gram
          </p>
        </div>

        <div className={`flex-1 relative mt-6 grains-stage ${activeScreen === 3 ? 'grains-on' : ''}`}>
          {[
            { left: 38, dur: 2.8, delay: 0.0 },
            { left: 52, dur: 3.2, delay: 0.4 },
            { left: 46, dur: 2.6, delay: 0.9 },
            { left: 58, dur: 3.0, delay: 1.3 },
            { left: 42, dur: 2.9, delay: 1.7 },
            { left: 50, dur: 3.4, delay: 2.1 },
            { left: 55, dur: 2.7, delay: 2.5 },
            { left: 44, dur: 3.1, delay: 2.9 },
            { left: 48, dur: 2.8, delay: 3.3 },
            { left: 53, dur: 3.0, delay: 3.7 },
            { left: 41, dur: 2.6, delay: 4.1 },
            { left: 56, dur: 3.2, delay: 4.5 },
          ].map((g, i) => (
            <span
              key={i}
              className="grain"
              style={{
                left: `${g.left}%`,
                animationDelay: `${g.delay}s`,
                '--dur': `${g.dur}s`,
              }}
            />
          ))}
          <div className="grain-pile" />
        </div>

      </div>

      {/* === SCREEN 5 — More than you paid for === */}
      <div
        className="h-full flex flex-col px-8 pt-20 relative overflow-hidden"
        style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {firstViewportParticles.slice(0, 12).map(p => (
            <span
              key={`s4-${p.id}`}
              className="particle particle-drift"
              style={{
                left: `${p.left}%`,
                bottom: `${p.bottom}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="relative" style={{ zIndex: 4 }}>
          <h2
            className="font-display text-app mb-4"
            style={{ fontWeight: 300, fontSize: '52px', lineHeight: '0.95' }}
          >
            more than
            <br />
            <span className="italic text-gold" style={{ fontWeight: 400 }}>
              you paid for
            </span>
          </h2>

          <p className="text-dim text-[13px] leading-relaxed font-display italic" style={{ fontWeight: 300 }}>
            lock longer for better
          </p>
        </div>

        <div className="flex-1" />

        <div className="relative flex items-end justify-around gap-6" style={{ zIndex: 4, height: '320px' }}>
          {[
            { pct: 2.5,  months: 6,  delay: 0.05 },
            { pct: 7,    months: 12, delay: 0.18 },
            { pct: 18.8, months: 24, delay: 0.34 },
          ].map((tier, i) => {
            const baseHeight = 240;
            const bonusHeight = baseHeight * (tier.pct / 100);
            return (
              <div key={i} className="flex flex-col items-center" style={{ width: '22%' }}>
                <div
                  className="text-gold font-num mb-2 tier-pct"
                  style={{
                    fontSize: '13px',
                    fontWeight: 400,
                    letterSpacing: '-0.02em',
                    textShadow: '0 0 12px rgba(201,169,97,0.6), 0 0 24px rgba(201,169,97,0.3)',
                    opacity: activeScreen === 4 ? 1 : 0,
                    transition: `opacity 0.5s ease-out ${tier.delay + 0.6}s`,
                  }}
                >
                  +{tier.pct}%
                </div>
                <div
                  className="w-full rounded-t-md tier-bonus"
                  style={{
                    background: 'linear-gradient(180deg, #E4C57E, #C9A961)',
                    boxShadow: '0 0 16px rgba(201,169,97,0.5)',
                    height: activeScreen === 4 ? `${bonusHeight}px` : '0px',
                    transitionDelay: `${tier.delay}s`,
                  }}
                />
                <div style={{ height: '3px' }} />
                <div
                  className="w-full rounded-b-md tier-base"
                  style={{
                    background: 'rgba(201,169,97,0.18)',
                    border: '1px solid rgba(201,169,97,0.25)',
                    height: activeScreen === 4 ? `${baseHeight}px` : '0px',
                    transitionDelay: `${tier.delay + 0.05}s`,
                  }}
                />
                <div
                  className="text-dim font-num mt-3"
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    opacity: activeScreen === 4 ? 0.7 : 0,
                    transition: `opacity 0.5s ease-out ${tier.delay + 0.7}s`,
                  }}
                >
                  {tier.months} mo
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex-1" />

      </div>

      {/* === SCREEN 6 — Safe and sound === */}
      <div
        className="h-full flex flex-col px-8 pt-20 relative overflow-hidden vault-screen"
        style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
      >
        <div className={`vault-screen-bg ${activeScreen === 5 ? 'vault-screen-bg-in' : ''}`} />
        <div className="relative" style={{ zIndex: 4 }}>
          <div
            className="font-num text-[10px] tracking-[0.25em] mb-8"
            style={{ color: 'rgba(26, 18, 8, 0.55)' }}
          >
            AU · 999.9 FINE
          </div>

          <h2
            className="font-display"
            style={{ fontWeight: 300, fontSize: '52px', lineHeight: '0.95', color: '#1a1208' }}
          >
            safe
            <br />
            <span className="italic" style={{ fontWeight: 400, color: 'rgba(255, 250, 230, 0.95)' }}>
              and sound
            </span>
          </h2>
          <p
            className="text-[13px] leading-relaxed mt-4 font-display italic"
            style={{ fontWeight: 300, color: 'rgba(26, 18, 8, 0.7)' }}
          >
            audited custody, yours to claim, anytime
          </p>
        </div>

        <div className="flex-1" />

        <div className="relative flex items-center justify-center" style={{ zIndex: 4 }}>
          <div className={`vault-shield ${activeScreen === 5 ? 'vault-shield-on' : ''}`}>
            <svg
              width="92"
              height="92"
              viewBox="0 0 92 92"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: 'block', opacity: 0.78 }}
            >
              <path
                d="M46 8 C 46 8, 28 14, 14 14 C 14 14, 12 50, 24 66 C 34 79, 46 84, 46 84 C 46 84, 58 79, 68 66 C 80 50, 78 14, 78 14 C 64 14, 46 8, 46 8 Z"
                fill="none"
                stroke="#1a1208"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                className="vault-shield-check"
                d="M 32 46 L 42 56 L 62 36"
                fill="none"
                stroke="#1a1208"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <div className="flex-1" />

        <div className={`vault-screen-shimmer ${activeScreen === 5 ? 'vault-screen-shimmer-on' : ''}`} />
      </div>

      {/* === SCREEN 7 — Accumulation === */}
      <div
        className="h-full flex flex-col px-8 pt-20 relative overflow-hidden"
        style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {firstViewportParticles.slice(0, 10).map(p => (
            <span
              key={`acc-${p.id}`}
              className="particle particle-drift"
              style={{
                left: `${p.left}%`,
                bottom: `${p.bottom}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="relative" style={{ zIndex: 4 }}>
          <h2
            className="font-display text-app"
            style={{ fontWeight: 300, fontSize: '52px', lineHeight: '0.95' }}
          >
            accumulation
            <br />
            <span className="italic text-gold" style={{ fontWeight: 400 }}>
              is a good habit
            </span>
          </h2>
          <p className="text-dim text-[13px] leading-relaxed mt-4 font-display italic" style={{ fontWeight: 300 }}>
            anybody can
          </p>
        </div>

        <div className="flex-1" />

        <div className="relative" style={{ zIndex: 4 }}>
          <div className="text-[10px] uppercase tracking-[0.3em] text-dim mb-4">
            $100/mo · Vein · 5 years
          </div>

          <div style={{ height: '180px', paddingTop: '16px' }}>
            <svg viewBox="0 0 280 160" overflow="visible" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
              <line
                x1="0" y1="130" x2="280" y2="130"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
                strokeDasharray="2 4"
                style={{
                  opacity: activeScreen === 6 ? 1 : 0,
                  transition: 'opacity 0.6s ease-out 0.0s',
                }}
              />

              <path
                d={accumData.fillPath}
                fill="rgba(201, 169, 97, 0.06)"
                style={{
                  opacity: activeScreen === 6 ? 1 : 0,
                  transition: 'opacity 0.8s ease-out 0.8s',
                }}
              />

              <path
                d={accumData.invPath}
                fill="none"
                stroke="rgba(180,180,170,0.4)"
                strokeWidth="1.25"
                strokeLinecap="round"
                style={{
                  strokeDasharray: 500,
                  strokeDashoffset: activeScreen === 6 ? 0 : 500,
                  transition: 'stroke-dashoffset 1.6s cubic-bezier(0.4, 0.6, 0.3, 1) 0.4s',
                }}
              />

              <path
                d={accumData.valPath}
                fill="none"
                stroke="#C9A961"
                strokeWidth="1.5"
                strokeLinecap="round"
                style={{
                  strokeDasharray: 500,
                  strokeDashoffset: activeScreen === 6 ? 0 : 500,
                  transition: 'stroke-dashoffset 1.6s cubic-bezier(0.4, 0.6, 0.3, 1) 0.2s',
                }}
              />

              <text
                x="0" y="148"
                fill="rgba(255,255,255,0.25)"
                fontSize="8"
                fontFamily="'Geist Mono', monospace"
                style={{
                  opacity: activeScreen === 6 ? 1 : 0,
                  transition: 'opacity 0.5s ease-out 1.6s',
                }}
              >now</text>
              <text
                x="280" y="148"
                textAnchor="end"
                fill="rgba(255,255,255,0.25)"
                fontSize="8"
                fontFamily="'Geist Mono', monospace"
                style={{
                  opacity: activeScreen === 6 ? 1 : 0,
                  transition: 'opacity 0.5s ease-out 1.7s',
                }}
              >5yr</text>

              <text
                x="276" y={accumData.valEndY - 4}
                textAnchor="end"
                fill="#C9A961"
                fontSize="9"
                fontFamily="'Geist Mono', monospace"
                style={{
                  opacity: activeScreen === 6 ? 1 : 0,
                  transition: 'opacity 0.5s ease-out 1.8s',
                }}
              >value</text>
              <text
                x="276" y={accumData.invEndY + 12}
                textAnchor="end"
                fill="rgba(180,180,170,0.5)"
                fontSize="9"
                fontFamily="'Geist Mono', monospace"
                style={{
                  opacity: activeScreen === 6 ? 1 : 0,
                  transition: 'opacity 0.5s ease-out 1.9s',
                }}
              >invested</text>
            </svg>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div>
              <div className="text-[9px] text-dim uppercase tracking-widest">Invested</div>
              <div className="text-sm font-num text-app">{`$${accumData.invested}`}</div>
            </div>
            <div>
              <div className="text-[9px] text-dim uppercase tracking-widest">Gold</div>
              <div className="text-sm font-num text-app">{`${accumData.gold.toFixed(1)}g`}</div>
            </div>
            <div>
              <div className="text-[9px] text-dim uppercase tracking-widest">Value</div>
              <div className="text-sm font-num text-gold">{`$${Math.round(accumData.value)}`}</div>
            </div>
            <div>
              <div className="text-[9px] text-dim uppercase tracking-widest">Return</div>
              <div className="text-sm font-num text-gold">{`+${accumData.returnPct.toFixed(0)}%`}</div>
            </div>
          </div>

          <div className="text-[8px] text-dim mt-3" style={{ opacity: 0.5 }}>
            8% annual gold appreciation · 20yr median
          </div>
        </div>

        <div className="flex-1" />
      </div>

      {/* === SCREEN 8 — Connect the dots === */}
      <div
        className="h-full flex flex-col px-8 pt-20 relative overflow-hidden"
        style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {connectParticles.map(p => (
            <span
              key={p.id}
              className="particle-river"
              style={{
                left: `${p.left}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
                '--drift-x': `${p.drift}px`,
                '--pop': p.opacity,
              }}
            />
          ))}
        </div>

        <div className="relative" style={{ zIndex: 4 }}>
          <h2
            className="font-display text-app mb-3"
            style={{ fontWeight: 300, fontSize: '52px', lineHeight: '0.95' }}
          >
            connect
            <br />
            <span className="italic text-gold" style={{ fontWeight: 400 }}>
              the dots
            </span>
          </h2>
          <p className="text-dim text-[13px] leading-relaxed font-display italic" style={{ fontWeight: 300 }}>
            touch the musa
          </p>
        </div>

        <div className="relative flex-1 flex items-center justify-center" style={{ zIndex: 3 }}>
          <style>{vortexKeyframes}</style>
          <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
            <div className="relative" style={{ width: 0, height: 0 }}>
              {connectVortex.map(p => (
                <span
                  key={p.id}
                  className="particle-vortex"
                  style={{
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    marginLeft: `-${p.size / 2}px`,
                    marginTop: `-${p.size / 2}px`,
                    animationName: `vortex${p.id}`,
                    animationDuration: `${p.dur}s`,
                    animationDelay: `${p.delay}s`,
                  }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={onContinue}
            className="press relative bg-transparent border-0 p-0"
            style={{ width: '220px', height: '220px', cursor: 'pointer' }}
            aria-label="Begin"
          >
            <div
              ref={fillRef}
              className={`connect-fill ${activeScreen === 7 ? 'connect-fill-on' : ''}`}
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                width: '200px', height: '200px',
                marginLeft: '-100px', marginTop: '-100px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(201,169,97,0.78) 0%, rgba(201,169,97,0.5) 32%, rgba(201,169,97,0.24) 58%, rgba(201,169,97,0.08) 78%, transparent 90%)',
                filter: 'blur(3px)',
              }}
            />
            <div
              ref={singularityRef}
              className={`singularity-glow ${activeScreen === 7 ? 'singularity-glow-on' : ''}`}
            />
            <svg
              viewBox="0 0 220 220"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            >
              <path
                key={`grey-${arcPulse}`}
                d="M 110 10 A 100 100 0 0 1 110 210"
                fill="none"
                stroke="rgba(180,180,170,0.55)"
                strokeWidth="1.5"
                strokeLinecap="round"
                style={{
                  strokeDasharray: 320,
                  strokeDashoffset: 320,
                  opacity: 0,
                  animation: activeScreen === 7 && arcPulse > 0 ? 'arcFlash 0.95s cubic-bezier(0.4, 0.6, 0.3, 1) forwards' : 'none',
                }}
              />
              <path
                key={`gold-${arcPulse}`}
                d="M 110 210 A 100 100 0 0 1 110 10"
                fill="none"
                stroke="#C9A961"
                strokeWidth="1.5"
                strokeLinecap="round"
                style={{
                  strokeDasharray: 320,
                  strokeDashoffset: 320,
                  opacity: 0,
                  animation: activeScreen === 7 && arcPulse > 0 ? 'arcFlash 0.95s cubic-bezier(0.4, 0.6, 0.3, 1) forwards' : 'none',
                }}
              />
              <circle
                key={`user-${arcPulse}`}
                className="endpoint-user"
                cx="110" cy="10" r="4"
                fill="rgba(232, 218, 188, 0.9)"
                style={{
                  animation: activeScreen === 7 && arcPulse > 0
                    ? 'endpointFlashUser 0.95s cubic-bezier(0.4, 0.6, 0.3, 1) forwards'
                    : 'none',
                }}
              />
              <circle
                key={`miner-${arcPulse}`}
                className="endpoint-miner"
                cx="110" cy="210" r="4"
                fill="#C9A961"
                style={{
                  animation: activeScreen === 7 && arcPulse > 0
                    ? 'endpointFlashMiner 0.95s cubic-bezier(0.4, 0.6, 0.3, 1) forwards'
                    : 'none',
                }}
              />
            </svg>
            <div
              key={`label-user-${arcPulse}`}
              className="font-num text-dim absolute"
              style={{
                top: '-22px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '10px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                opacity: 0.7,
                animation: activeScreen === 7 && arcPulse > 0
                  ? 'labelFlashUser 0.95s cubic-bezier(0.4, 0.6, 0.3, 1) forwards'
                  : 'none',
              }}
            >
              you
            </div>
            <div
              key={`label-miner-${arcPulse}`}
              className="font-num text-dim absolute"
              style={{
                bottom: '-22px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '10px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                opacity: 0.7,
                animation: activeScreen === 7 && arcPulse > 0
                  ? 'labelFlashMiner 0.95s cubic-bezier(0.4, 0.6, 0.3, 1) forwards'
                  : 'none',
              }}
            >
              miners
            </div>
            <div
              className="absolute"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                key={`musa-pulse-${arcPulse}`}
                style={{
                  animation: activeScreen === 7 && arcPulse > 0
                    ? 'musaLogoPulse 0.95s cubic-bezier(0.4, 0.6, 0.3, 1) forwards'
                    : 'none',
                }}
              >
                <div className="text-[10px] uppercase tracking-[0.4em] musa-logo">
                  <span className="musa-logo-text">musa</span>
                  <span className="musa-logo-shimmer">musa</span>
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingScreen;

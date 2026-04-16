// Landing chooser — the two-tile pitch surface.
// Sits above the app: one path into the prototype, one into the simulator.
// Type treatments mirror the prototype exactly — same MusaLogo (10px,
// 0.4em tracking, warm cream dim, breathing glow + shimmer sweep),
// same Fraunces italic gold for hero text, same plain footer.
// See CLAUDE.md § "Voice & brand rules".

import React from 'react';

const tiles = [
  {
    href: '#/app',
    eyebrow: 'the prototype',
    title: 'touch the musa',
    body: 'the consumer app — onboarding, mines, delivery',
  },
  {
    href: '#/sim',
    eyebrow: 'the simulator',
    title: 'run the math',
    body: 'personas, scenarios, weekly stress test',
  },
];

export default function Landing() {
  return (
    <div
      className="w-full flex flex-col items-center justify-between px-6 py-10 sm:py-16"
      style={{ minHeight: '100dvh', background: '#0a0908', color: '#e8e6e0' }}
    >
      <style>{`
        /* === musa logo — replicated from prototype so the mark reads identical === */
        .musa-logo {
          position: relative;
          display: inline-block;
          color: rgba(232, 218, 188, 0.7);
          animation: musaLogoBreath 4.2s ease-in-out infinite;
        }
        .musa-logo-text { position: relative; z-index: 1; }
        .musa-logo-shimmer {
          position: absolute;
          top: 0; left: 0;
          z-index: 2;
          pointer-events: none;
          color: rgba(255, 240, 200, 1);
          background: linear-gradient(
            100deg,
            transparent 30%,
            rgba(255, 240, 200, 1) 48%,
            rgba(255, 240, 200, 1) 52%,
            transparent 70%
          );
          background-size: 200% 100%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: musaLogoShimmer 5.5s ease-in-out infinite;
        }
        @keyframes musaLogoBreath {
          0%, 100% { text-shadow: 0 0 6px rgba(201,169,97,0.18), 0 0 14px rgba(201,169,97,0.08); }
          50%      { text-shadow: 0 0 10px rgba(201,169,97,0.35), 0 0 22px rgba(201,169,97,0.18); }
        }
        @keyframes musaLogoShimmer {
          0%   { background-position: 150% 0; }
          15%  { background-position: -50% 0; }
          100% { background-position: -50% 0; }
        }

        /* === tile drift-in === */
        @keyframes landingDrift {
          0%   { transform: translateY(8px); opacity: 0; }
          100% { transform: translateY(0);   opacity: 1; }
        }
        .landing-tile {
          animation: landingDrift 1.2s cubic-bezier(.22,.61,.36,1) both;
          transition: border-color 600ms ease, background-color 600ms ease;
        }
        .landing-tile:hover {
          border-color: rgba(201,169,97,0.55);
          background-color: rgba(201,169,97,0.04);
        }
        .landing-tile .tile-title { transition: color 600ms ease; }
        .landing-tile:hover .tile-title { color: #e4c57e; }
        .landing-tile .tile-arrow {
          transition: transform 600ms cubic-bezier(.22,.61,.36,1), color 600ms ease;
        }
        .landing-tile:hover .tile-arrow {
          transform: translateX(6px);
          color: #e4c57e;
        }
      `}</style>

      <header className="w-full flex items-center justify-center pt-2">
        <div className="text-[10px] uppercase tracking-[0.4em] musa-logo">
          <span className="musa-logo-text">musa</span>
          <span className="musa-logo-shimmer">musa</span>
        </div>
      </header>

      <main className="w-full max-w-5xl flex-1 flex items-center justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
          {tiles.map((t, i) => (
            <a
              key={t.href}
              href={t.href}
              className="landing-tile group block rounded-2xl border border-white/10 bg-surface px-7 py-10 sm:px-9 sm:py-12"
              style={{ animationDelay: `${0.25 + i * 0.18}s` }}
            >
              <div className="text-xs text-text-dim">{t.eyebrow}</div>
              <div className="tile-title font-display italic text-4xl sm:text-5xl text-gold mt-4 leading-tight">
                {t.title}
              </div>
              <div className="mt-6 flex items-end justify-between gap-6">
                <p className="text-sm sm:text-base text-text/80 leading-relaxed max-w-[28ch]">
                  {t.body}
                </p>
                <span className="tile-arrow text-gold text-2xl leading-none select-none" aria-hidden>
                  →
                </span>
              </div>
            </a>
          ))}
        </div>
      </main>

      <footer className="w-full flex items-center justify-center pt-10 sm:pt-16">
        <p className="text-[11px] text-text-dim">Real gold · real mines · delivered</p>
      </footer>
    </div>
  );
}

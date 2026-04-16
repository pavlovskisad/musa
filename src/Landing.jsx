// Landing chooser — the two-tile pitch surface.
// Sits above the app: one path into the prototype, one into the simulator.
// Brand rules: lowercase musa, no trailing periods on hero copy, slow breathing.
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
    <div className="w-full flex flex-col items-center justify-between px-6 py-10 sm:py-16 bg-bg text-text" style={{ minHeight: '100dvh' }}>
      <style>{`
        @keyframes landingBreath {
          0%, 100% { text-shadow: 0 0 18px rgba(201,169,97,0.18); opacity: 0.92; }
          50%      { text-shadow: 0 0 32px rgba(201,169,97,0.42); opacity: 1; }
        }
        @keyframes landingDrift {
          0%   { transform: translateY(8px); opacity: 0; }
          100% { transform: translateY(0);   opacity: 1; }
        }
        .landing-logo {
          font-family: 'Geist', system-ui, sans-serif;
          font-weight: 500;
          letter-spacing: 0.42em;
          text-transform: uppercase;
          font-size: 0.78rem;
          color: #c9a961;
          animation: landingBreath 4.6s ease-in-out infinite;
        }
        .landing-tile {
          animation: landingDrift 1.2s cubic-bezier(.22,.61,.36,1) both;
          transition: border-color 600ms ease, background-color 600ms ease, transform 600ms ease;
        }
        .landing-tile:hover {
          border-color: rgba(201,169,97,0.55);
          background-color: rgba(201,169,97,0.04);
        }
        .landing-tile .tile-title {
          transition: color 600ms ease;
        }
        .landing-tile:hover .tile-title {
          color: #e4c57e;
        }
        .landing-tile .tile-arrow {
          transition: transform 600ms cubic-bezier(.22,.61,.36,1), color 600ms ease;
        }
        .landing-tile:hover .tile-arrow {
          transform: translateX(6px);
          color: #e4c57e;
        }
      `}</style>

      <header className="w-full flex items-center justify-center pt-2">
        <span className="landing-logo">musa</span>
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
              <div className="text-xs uppercase tracking-[0.32em] text-text-dim font-num">
                {t.eyebrow}
              </div>
              <div
                className="tile-title font-display italic text-4xl sm:text-5xl text-gold mt-5 leading-tight"
                style={{ fontFeatureSettings: '"ss01"' }}
              >
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
        <span className="text-[11px] uppercase tracking-[0.36em] text-text-dim font-num">
          real gold · real mines · delivered
        </span>
      </footer>
    </div>
  );
}

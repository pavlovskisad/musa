import React from 'react';
import { Pickaxe, Plus, User } from 'lucide-react';

// Desktop only (see `Desktop app` in app.css): the persistent left rail that replaces
// the per-screen back button, logo and profile button of the phone layout.
const ITEMS = [
  { key: 'home', label: 'Mines', Icon: Pickaxe, screens: ['home', 'unitDetail', 'exit'] },
  { key: 'browse', label: 'New mine', Icon: Plus, screens: ['browse', 'buy'] },
  { key: 'profile', label: 'Profile', Icon: User, screens: ['profile'] },
];

function DeskRail({ screen, onNav, userName }) {
  return (
    <nav className="desk-rail" aria-label="Main">
      <button type="button" className="desk-rail-logo press" onClick={() => onNav('onboarding')} aria-label="Back to start">
        musa
      </button>
      <div className="desk-rail-items">
        {ITEMS.map(({ key, label, Icon, screens }) => {
          const active = screens.includes(screen);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNav(key)}
              className={`desk-rail-item press-soft ${active ? 'is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={16} strokeWidth={1.75} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      <div className="desk-rail-foot">
        {userName && <div className="desk-rail-user">{userName}</div>}
        <div>Real gold · real mines · delivered</div>
      </div>
    </nav>
  );
}

export default DeskRail;

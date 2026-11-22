import React from 'react';

// Shown only on wide screens, beside the phone-sized app frame (see `.app-stage` in app.css).
// The app is designed for a phone; on a desktop it keeps that shape instead of stretching.
function DesktopSide() {
  return (
    <aside className="stage-side" aria-hidden="true">
      <div className="stage-logo">musa</div>
      <div>
        <div className="font-display stage-head">
          from mine
          <br />
          <span className="italic text-gold">to your wallet</span>
        </div>
        <p className="font-display italic stage-sub">directly, gram by gram</p>
      </div>
      <div className="stage-foot">Real gold · real mines · delivered</div>
    </aside>
  );
}

export default DesktopSide;

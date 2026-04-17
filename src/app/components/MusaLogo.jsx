import React from 'react';

function MusaLogo({ onClick, className = '' }) {
  const handleClick = onClick || (() => { window.location.hash = '#/'; });
  const logo = (
    <div className={`text-[10px] uppercase tracking-[0.4em] musa-logo ${className}`}>
      <span className="musa-logo-text">musa</span>
      <span className="musa-logo-shimmer">musa</span>
    </div>
  );
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Go home"
      className="press"
      style={{
        padding: '14px 20px',
        margin: '-14px -20px',
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'inherit',
        font: 'inherit',
      }}
    >
      {logo}
    </button>
  );
}

export default MusaLogo;

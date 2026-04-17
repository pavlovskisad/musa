import React from 'react';

function MusaLogo({ onClick, className = '' }) {
  const logo = (
    <div className={`text-[10px] uppercase tracking-[0.4em] musa-logo ${className}`}>
      <span className="musa-logo-text">musa</span>
      <span className="musa-logo-shimmer">musa</span>
    </div>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Go home"
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
  return logo;
}

export default MusaLogo;

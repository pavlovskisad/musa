import React from 'react';

function Row({ label, value, accent }) {
  return (
    <div className="flex justify-between items-center text-[11px]">
      <span className="text-dim">{label}</span>
      <span className={`font-num ${accent ? 'text-gold' : 'text-app'}`}>{value}</span>
    </div>
  );
}

export default Row;

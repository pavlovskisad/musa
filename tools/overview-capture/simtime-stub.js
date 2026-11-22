import { useState, useEffect, useRef } from 'react';
// capture only: one second of real time is one day in the app
export function useSimTime() {
  const mult = (typeof window !== 'undefined' && window.__MULT) || 86400;
  const [simTime, setSimTime] = useState(() => new Date());
  const last = useRef(Date.now());
  useEffect(() => {
    last.current = Date.now();
    const i = setInterval(() => { const n = Date.now(); const d = n - last.current; last.current = n; setSimTime(p => new Date(p.getTime() + d * mult)); }, (typeof window !== 'undefined' && window.__TICK) || 80);
    return () => clearInterval(i);
  }, [mult]);
  return { simTime, setSimTime };
}

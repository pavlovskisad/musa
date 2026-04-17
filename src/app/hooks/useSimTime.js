import { useState, useEffect, useRef } from 'react';

export function useSimTime(timeMult = 1) {
  const [simTime, setSimTime] = useState(() => new Date());
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    lastTickRef.current = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const realDelta = now - lastTickRef.current;
      lastTickRef.current = now;
      setSimTime(prev => new Date(prev.getTime() + realDelta * timeMult));
    }, 80);
    return () => clearInterval(interval);
  }, [timeMult]);

  return { simTime, setSimTime };
}

// Hash-based router.
//
//   / or #/     → consumer app (src/app/)
//   #/sim       → economic simulator (prototypes/)

import React, { useEffect, useState } from 'react';
import MusaApp from './app/App.jsx';
import Simulator from '../prototypes/musa-simulator.jsx';

const parseRoute = (hash) => {
  const h = (hash || '').replace(/^#\/?/, '').split('?')[0].split('/')[0];
  if (h === 'sim' || h === 'simulator') return 'sim';
  return 'app';
};

export default function App() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (route === 'sim') return <Simulator />;
  return <MusaApp />;
}

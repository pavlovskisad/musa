// Hash-based router for the pitch surface.
//
//   #/        → Landing chooser
//   #/app     → consumer app (modular, src/app/)
//   #/sim     → economic simulator (single-file, prototypes/)

import React, { useEffect, useState } from 'react';
import Landing from './Landing.jsx';
import MusaApp from './app/App.jsx';
import Simulator from '../prototypes/musa-simulator.jsx';

const parseRoute = (hash) => {
  const h = (hash || '').replace(/^#\/?/, '').split('?')[0].split('/')[0];
  if (h === 'app') return 'app';
  if (h === 'sim' || h === 'simulator') return 'sim';
  return 'landing';
};

export default function App() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (route === 'app') return <MusaApp />;
  if (route === 'sim') return <Simulator />;
  return <Landing />;
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import { baseSepolia } from 'viem/chains';
import App from './App.jsx';
import './index.css';

const privyAppId = import.meta.env.VITE_PRIVY_APP_ID || '';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PrivyProvider
      appId={privyAppId}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#c9a961',
          landingHeader: 'musa',
          showWalletLoginFirst: false,
        },
        loginMethods: ['passkey', 'email'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        defaultChain: baseSepolia,
        supportedChains: [baseSepolia],
      }}
    >
      <App />
    </PrivyProvider>
  </React.StrictMode>
);

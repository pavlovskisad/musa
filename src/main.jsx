import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import App from './App.jsx';
import './index.css';

const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;

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
        defaultChain: { id: 84532, name: 'Base Sepolia' },
        supportedChains: [{ id: 84532, name: 'Base Sepolia' }],
      }}
    >
      <App />
    </PrivyProvider>
  </React.StrictMode>
);

// capture only: sign-in state that the recording script can flip
import { useSyncExternalStore } from 'react';
const user = { id: 'demo', email: { address: 'demo@example.com' } };
const wallet = { walletClientType: 'privy', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' };
let authed = !(typeof location !== 'undefined' && location.search.includes('anon'));
const subs = new Set();
if (typeof window !== 'undefined') window.__setAuth = (v) => { authed = v; subs.forEach(f => f()); };
const sub = (f) => { subs.add(f); return () => subs.delete(f); };
const fns = { login() { window.__onLogin && window.__onLogin(); }, logout() {}, getAccessToken: async () => 'demo-token' };
export const PrivyProvider = ({ children }) => children;
export const usePrivy = () => { const a = useSyncExternalStore(sub, () => authed); return { ready: true, authenticated: a, user: a ? user : null, ...fns }; };
export const useSendTransaction = () => ({ sendTransaction: async () => ({ hash: '0x0' }) });
const wl = { wallets: [wallet] };
export const useWallets = () => wl;
export const useCreateWallet = () => ({ createWallet: async () => wallet });

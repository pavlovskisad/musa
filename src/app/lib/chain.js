import { BrowserProvider, Contract, JsonRpcProvider, parseUnits } from 'ethers';
import musaAbi from './musaAbi.json';

export const MUSA_ADDRESS = import.meta.env.VITE_MUSA_ADDRESS;
export const PAXG_ADDRESS = import.meta.env.VITE_PAXG_ADDRESS;
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 84532);
const RPC_URL = import.meta.env.VITE_BASE_SEPOLIA_RPC_URL;

const readProvider = RPC_URL ? new JsonRpcProvider(RPC_URL) : null;

const TIER_ENUM = { spark: 0, flow: 1, vein: 2 };
export const tierToEnum = (tierId) => TIER_ENUM[tierId];

// Convert a JS float gram amount to the contract's 18-decimal representation
export const gramsToWei = (grams) => parseUnits(grams.toFixed(18), 18);
export const weiToGrams = (wei) => Number(wei) / 1e18;

export const readMusa = () => {
  if (!readProvider || !MUSA_ADDRESS) return null;
  return new Contract(MUSA_ADDRESS, musaAbi, readProvider);
};

// --- Read helpers ---

export async function readClaimableGrams(positionId) {
  const musa = readMusa();
  if (!musa) return 0;
  const wei = await musa.claimableGrams(positionId);
  return weiToGrams(wei);
}

export async function readSolvencyRatio() {
  const musa = readMusa();
  if (!musa) return null;
  const ratio = await musa.solvencyRatio();
  // 1e18 = 100% covered; cap at a readable number
  const num = Number(ratio) / 1e18;
  return Number.isFinite(num) ? num : null;
}

// --- User-signed transactions via Privy embedded wallet ---

async function walletContract(privyWallet) {
  const ethProvider = await privyWallet.getEthereumProvider();
  await ethProvider.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: '0x' + CHAIN_ID.toString(16) }],
  }).catch(() => {});
  const provider = new BrowserProvider(ethProvider);
  const signer = await provider.getSigner();
  return new Contract(MUSA_ADDRESS, musaAbi, signer);
}

export async function claimPosition(privyWallet, positionId) {
  const musa = await walletContract(privyWallet);
  const tx = await musa.claim(positionId);
  return tx.wait();
}

export async function exitPositionEarly(privyWallet, positionId) {
  const musa = await walletContract(privyWallet);
  const tx = await musa.exitEarly(positionId);
  return tx.wait();
}

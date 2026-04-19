import { Contract, Interface, JsonRpcProvider, parseUnits } from 'ethers';
import musaAbi from './musaAbi.json';

export const MUSA_ADDRESS = import.meta.env.VITE_MUSA_ADDRESS;
export const PAXG_ADDRESS = import.meta.env.VITE_PAXG_ADDRESS;
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 84532);
const RPC_URL = import.meta.env.VITE_BASE_SEPOLIA_RPC_URL;

const readProvider = RPC_URL ? new JsonRpcProvider(RPC_URL) : null;
const musaIface = new Interface(musaAbi);

const TIER_ENUM = { spark: 0, flow: 1, vein: 2 };
export const tierToEnum = (tierId) => TIER_ENUM[tierId];

export const gramsToWei = (grams) => parseUnits(grams.toFixed(18), 18);
export const weiToGrams = (wei) => Number(wei) / 1e18;

export const readMusa = () => {
  if (!readProvider || !MUSA_ADDRESS) return null;
  return new Contract(MUSA_ADDRESS, musaAbi, readProvider);
};

// --- Read helpers ---

const ERC20_BALANCE_ABI = ['function balanceOf(address) view returns (uint256)'];

export async function readPaxgBalance(walletAddress) {
  if (!readProvider || !PAXG_ADDRESS || !walletAddress) return 0;
  const paxg = new Contract(PAXG_ADDRESS, ERC20_BALANCE_ABI, readProvider);
  const wei = await paxg.balanceOf(walletAddress);
  return weiToGrams(wei);
}

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
  const num = Number(ratio) / 1e18;
  return Number.isFinite(num) ? num : null;
}

export async function readUserPositionIds(walletAddress) {
  const musa = readMusa();
  if (!musa || !walletAddress) return [];
  const ids = await musa.getUserPositions(walletAddress);
  return ids.map(id => Number(id));
}

// --- User-signed transactions via Privy embedded wallet ---
// sendTransaction comes from Privy's useSendTransaction hook; sponsor: true
// routes gas through Privy's native paymaster so users never need ETH.

export async function claimPosition(sendTransaction, positionId) {
  const data = musaIface.encodeFunctionData('claim', [positionId]);
  return sendTransaction(
    { to: MUSA_ADDRESS, data, chainId: CHAIN_ID },
    { sponsor: true }
  );
}

export async function claimAllPositions(sendTransaction, positionIds) {
  const data = musaIface.encodeFunctionData('claimAll', [positionIds]);
  return sendTransaction(
    { to: MUSA_ADDRESS, data, chainId: CHAIN_ID },
    { sponsor: true }
  );
}

export async function exitPositionEarly(sendTransaction, positionId) {
  const data = musaIface.encodeFunctionData('exitEarly', [positionId]);
  return sendTransaction(
    { to: MUSA_ADDRESS, data, chainId: CHAIN_ID },
    { sponsor: true }
  );
}

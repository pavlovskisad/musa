import { JsonRpcProvider, Wallet, Contract, parseUnits } from 'ethers';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const musaAbi = JSON.parse(readFileSync(join(__dirname, 'musaAbi.json'), 'utf8'));

const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;
const ADMIN_KEY = process.env.ADMIN_PRIVATE_KEY;
const MUSA_ADDRESS = process.env.MUSA_ADDRESS;

let _musa = null;
function getMusa() {
  if (_musa) return _musa;
  if (!RPC_URL || !ADMIN_KEY || !MUSA_ADDRESS) {
    throw new Error('Missing RPC_URL / ADMIN_PRIVATE_KEY / MUSA_ADDRESS');
  }
  const provider = new JsonRpcProvider(RPC_URL);
  const signer = new Wallet(ADMIN_KEY, provider);
  _musa = new Contract(MUSA_ADDRESS, musaAbi, signer);
  return _musa;
}

const TIER_ENUM = { spark: 0, flow: 1, vein: 2 };

/**
 * Create an on-chain position as admin. Returns { positionId, txHash }.
 */
export async function createPositionOnChain({ walletAddress, tier, gramsTotal, pricePaidUSD }) {
  const musa = getMusa();
  const tierEnum = TIER_ENUM[tier];
  if (tierEnum === undefined) throw new Error(`Unknown tier: ${tier}`);

  const gramsWei = parseUnits(gramsTotal.toFixed(18), 18);
  const priceWei = parseUnits(pricePaidUSD.toFixed(18), 18);

  const tx = await musa.createPosition(walletAddress, tierEnum, gramsWei, priceWei);
  const receipt = await tx.wait();

  // Parse PositionCreated event to get position ID
  const iface = musa.interface;
  let positionId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed.name === 'PositionCreated') {
        positionId = Number(parsed.args.id);
        break;
      }
    } catch {}
  }

  return { positionId, txHash: receipt.hash };
}

import sql from './_lib/db.js';
import { JsonRpcProvider, Contract } from 'ethers';

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;
const MUSA_ADDRESS = process.env.MUSA_ADDRESS;
const PAXG_ADDRESS = process.env.VITE_PAXG_ADDRESS || process.env.PAXG_ADDRESS;

const viewAbi = [
  'function reserveBalance() view returns (uint256)',
  'function solvencyRatio() view returns (uint256)',
  'function totalOutstandingGrams() view returns (uint256)',
  'function positions(uint256) view returns (address owner, uint8 tier, uint256 gramsTotal, uint256 pricePaidUSD, uint256 createdAt, uint256 exitedAt, uint256 gramsClaimed, bool settled)',
  'function getUserPositions(address user) view returns (uint256[])',
];

function getProvider() {
  if (!RPC_URL) return null;
  return new JsonRpcProvider(RPC_URL);
}

function getMusa(provider) {
  if (!provider || !MUSA_ADDRESS) return null;
  return new Contract(MUSA_ADDRESS, viewAbi, provider);
}

const w = (wei) => Number(wei) / 1e18;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = req.headers.authorization;
  if (!ADMIN_SECRET || !auth || auth !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const [users, units] = await Promise.all([
      sql`SELECT * FROM users ORDER BY created_at DESC`,
      sql`SELECT * FROM units ORDER BY created_at DESC`,
    ]);

    let chain = null;
    const provider = getProvider();
    const musa = getMusa(provider);

    if (musa) {
      try {
        const [reserveWei, solvencyWei, outstandingWei] = await Promise.all([
          musa.reserveBalance(),
          musa.solvencyRatio().catch(() => null),
          musa.totalOutstandingGrams(),
        ]);

        let paxgBalance = null;
        if (PAXG_ADDRESS && provider) {
          try {
            const paxg = new Contract(PAXG_ADDRESS, ['function balanceOf(address) view returns (uint256)'], provider);
            paxgBalance = w(await paxg.balanceOf(MUSA_ADDRESS));
          } catch {}
        }

        chain = {
          contractAddress: MUSA_ADDRESS,
          reserveGrams: w(reserveWei) * 31.1035,
          reservePaxg: w(reserveWei),
          solvencyRatio: solvencyWei != null ? w(solvencyWei) : null,
          outstandingGrams: w(outstandingWei),
          paxgBalance,
        };
      } catch (err) {
        chain = { error: err.message };
      }
    }

    const data = {
      users: users.map(u => ({
        id: u.id,
        privyDid: u.privy_did,
        walletAddress: u.wallet_address,
        createdAt: u.created_at,
      })),
      units: units.map(u => ({
        id: u.id,
        userId: u.user_id,
        tier: u.tier,
        pricePaid: Number(u.price_paid),
        faceValue: Number(u.face_value),
        gramsTotal: Number(u.grams_total),
        goldPriceAtPurchase: Number(u.gold_price_at_purchase),
        purchasedAt: Number(u.purchased_at),
        exitedAt: u.exited_at ? Number(u.exited_at) : null,
        gramsAtExit: u.grams_at_exit ? Number(u.grams_at_exit) : null,
        gramsClaimed: Number(u.grams_claimed || 0),
        positionId: u.position_id != null ? Number(u.position_id) : null,
        txHash: u.tx_hash || null,
        walletAddress: u.wallet_address || null,
        createdAt: u.created_at,
      })),
      chain,
      timestamp: new Date().toISOString(),
    };

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

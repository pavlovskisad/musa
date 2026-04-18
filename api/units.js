import sql from './_lib/db.js';
import privy, { verifyAuth } from './_lib/auth.js';
import { createPositionOnChain } from './_lib/chain.js';

export default async function handler(req, res) {
  const userId = await verifyAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  await sql`INSERT INTO users (privy_did) VALUES (${userId}) ON CONFLICT (privy_did) DO NOTHING`;

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM units WHERE user_id = ${userId} ORDER BY created_at DESC`;
    const units = rows.map(row => ({
      id: row.id,
      tier: row.tier,
      pricePaid: Number(row.price_paid),
      faceValue: Number(row.face_value),
      gramsTotal: Number(row.grams_total),
      goldPriceAtPurchase: Number(row.gold_price_at_purchase),
      purchasedAt: Number(row.purchased_at),
      exitedAt: row.exited_at ? Number(row.exited_at) : null,
      gramsAtExit: row.grams_at_exit ? Number(row.grams_at_exit) : null,
      positionId: row.position_id != null ? Number(row.position_id) : null,
      txHash: row.tx_hash || null,
      walletAddress: row.wallet_address || null,
    }));
    return res.json(units);
  }

  if (req.method === 'POST') {
    const { id, tier, pricePaid, faceValue, gramsTotal, goldPriceAtPurchase, purchasedAt } = req.body;
    if (!id || !tier || !pricePaid || !faceValue || !gramsTotal || !goldPriceAtPurchase || !purchasedAt) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // Look up user's wallet address from Privy — check all possible locations
    const user = await privy.getUser(userId);
    const accounts = user?.linkedAccounts || [];
    const embedded = accounts.find(a => a.type === 'wallet' && a.walletClientType === 'privy');
    const anyWallet = accounts.find(a => a.type === 'wallet' || a.type === 'smart_wallet');
    const walletAddress = embedded?.address || anyWallet?.address || user?.wallet?.address;
    if (!walletAddress) {
      console.error('No wallet found on user. linkedAccounts:', JSON.stringify(accounts.map(a => ({ type: a.type, walletClientType: a.walletClientType }))));
      return res.status(400).json({ error: 'No wallet on user — check Privy dashboard: disable Smart Wallets, ensure embedded wallets are enabled' });
    }

    // Update user row with wallet address (first time we see it)
    await sql`UPDATE users SET wallet_address = ${walletAddress} WHERE privy_did = ${userId} AND wallet_address IS NULL`;

    // Create position on-chain
    let positionId = null;
    let txHash = null;
    try {
      const result = await createPositionOnChain({ walletAddress, tier, gramsTotal, pricePaidUSD: pricePaid });
      positionId = result.positionId;
      txHash = result.txHash;
    } catch (err) {
      console.error('createPositionOnChain failed:', err);
      return res.status(500).json({ error: 'On-chain position creation failed', detail: String(err.message || err) });
    }

    await sql`INSERT INTO units (id, user_id, tier, price_paid, face_value, grams_total, gold_price_at_purchase, purchased_at, position_id, tx_hash, wallet_address)
              VALUES (${id}, ${userId}, ${tier}, ${pricePaid}, ${faceValue}, ${gramsTotal}, ${goldPriceAtPurchase}, ${purchasedAt}, ${positionId}, ${txHash}, ${walletAddress})`;
    return res.status(201).json({ id, positionId, txHash, walletAddress });
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM units WHERE user_id = ${userId}`;
    return res.json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).end();
}

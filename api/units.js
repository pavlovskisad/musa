import sql from './_lib/db.js';
import { verifyAuth } from './_lib/auth.js';

export default async function handler(req, res) {
  const userId = await verifyAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  // Ensure user row exists
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
    }));
    return res.json(units);
  }

  if (req.method === 'POST') {
    const { id, tier, pricePaid, faceValue, gramsTotal, goldPriceAtPurchase, purchasedAt } = req.body;
    if (!id || !tier || !pricePaid || !faceValue || !gramsTotal || !goldPriceAtPurchase || !purchasedAt) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    await sql`INSERT INTO units (id, user_id, tier, price_paid, face_value, grams_total, gold_price_at_purchase, purchased_at)
              VALUES (${id}, ${userId}, ${tier}, ${pricePaid}, ${faceValue}, ${gramsTotal}, ${goldPriceAtPurchase}, ${purchasedAt})`;
    return res.status(201).json({ id });
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM units WHERE user_id = ${userId}`;
    return res.json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).end();
}

import sql from '../../_lib/db.js';
import { verifyAuth } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).end();
  }

  const userId = await verifyAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  const { gramsClaimed } = req.body;

  if (gramsClaimed == null || gramsClaimed <= 0) {
    return res.status(400).json({ error: 'Missing or invalid gramsClaimed' });
  }

  const result = await sql`UPDATE units
    SET grams_claimed = COALESCE(grams_claimed, 0) + ${gramsClaimed}
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id, grams_claimed`;

  if (result.length === 0) {
    return res.status(404).json({ error: 'Unit not found' });
  }

  return res.json({ id: result[0].id, gramsClaimed: Number(result[0].grams_claimed) });
}

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
  const { exitedAt, gramsAtExit } = req.body;

  if (!exitedAt || gramsAtExit == null) {
    return res.status(400).json({ error: 'Missing exitedAt or gramsAtExit' });
  }

  const result = await sql`UPDATE units
    SET exited_at = ${exitedAt}, grams_at_exit = ${gramsAtExit}
    WHERE id = ${id} AND user_id = ${userId} AND exited_at IS NULL
    RETURNING id`;

  if (result.length === 0) {
    return res.status(404).json({ error: 'Unit not found or already exited' });
  }

  return res.json({ id: result[0].id });
}

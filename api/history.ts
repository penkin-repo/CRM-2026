import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = getDb();

  if (req.method === 'GET') {
    const result = await db.execute('SELECT * FROM history ORDER BY timestamp DESC LIMIT 50');
    const history = result.rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      action: r.action,
      description: r.description,
      snapshot: JSON.parse((r.snapshot as string) ?? '{}'),
    }));
    return res.status(200).json(history);
  }

  if (req.method === 'POST') {
    const h = req.body;
    await db.execute({
      sql: `INSERT INTO history (id, timestamp, action, description, snapshot)
            VALUES (?, ?, ?, ?, ?)`,
      args: [h.id, h.timestamp, h.action, h.description, JSON.stringify(h.snapshot)],
    });
    // Keep only last 50 entries
    await db.execute(`
      DELETE FROM history WHERE id NOT IN (
        SELECT id FROM history ORDER BY timestamp DESC LIMIT 50
      )
    `);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    await db.execute('DELETE FROM history');
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

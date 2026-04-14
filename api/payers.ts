import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = getDb();

  if (req.method === 'GET') {
    const result = await db.execute('SELECT * FROM payers ORDER BY created_at ASC');
    const payers = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      createdAt: r.created_at,
    }));
    return res.status(200).json(payers);
  }

  if (req.method === 'POST') {
    const p = req.body;
    await db.execute({
      sql: `INSERT INTO payers (id, name, created_at)
            VALUES (?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name`,
      args: [p.id, p.name, p.createdAt],
    });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    await db.execute({ sql: 'DELETE FROM payers WHERE id = ?', args: [id as string] });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

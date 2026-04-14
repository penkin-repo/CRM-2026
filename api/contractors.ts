import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = getDb();

  if (req.method === 'GET') {
    const result = await db.execute('SELECT * FROM contractors ORDER BY created_at ASC');
    const contractors = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      phone: r.phone ?? '',
      note: r.note ?? '',
      createdAt: r.created_at,
    }));
    return res.status(200).json(contractors);
  }

  if (req.method === 'POST') {
    const c = req.body;
    await db.execute({
      sql: `INSERT INTO contractors (id, name, phone, note, created_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name=excluded.name, phone=excluded.phone, note=excluded.note`,
      args: [c.id, c.name, c.phone ?? '', c.note ?? '', c.createdAt],
    });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    await db.execute({ sql: 'DELETE FROM contractors WHERE id = ?', args: [id as string] });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

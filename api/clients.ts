import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = getDb();

  if (req.method === 'GET') {
    const result = await db.execute('SELECT * FROM clients ORDER BY created_at ASC');
    const clients = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      phone: r.phone ?? '',
      contactPerson: r.contact_person ?? '',
      email: r.email ?? '',
      note: r.note ?? '',
      customFields: JSON.parse((r.custom_fields as string) ?? '[]'),
      createdAt: r.created_at,
    }));
    return res.status(200).json(clients);
  }

  if (req.method === 'POST') {
    const c = req.body;
    await db.execute({
      sql: `INSERT INTO clients (id, name, phone, contact_person, email, note, custom_fields, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name=excluded.name, phone=excluded.phone, contact_person=excluded.contact_person,
              email=excluded.email, note=excluded.note, custom_fields=excluded.custom_fields`,
      args: [c.id, c.name, c.phone ?? '', c.contactPerson ?? '', c.email ?? '', c.note ?? '',
             JSON.stringify(c.customFields ?? []), c.createdAt],
    });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    await db.execute({ sql: 'DELETE FROM clients WHERE id = ?', args: [id as string] });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

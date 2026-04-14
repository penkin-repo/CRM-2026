import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = getDb();

  if (req.method === 'GET') {
    const result = await db.execute('SELECT * FROM orders ORDER BY date DESC');
    const orders = result.rows.map(r => ({
      id: r.id,
      date: r.date,
      clientId: r.client_id,
      productName: r.product_name,
      contractors: JSON.parse((r.contractors as string) ?? '[]'),
      saleAmount: r.sale_amount,
      paymentReceiverId: r.payment_receiver_id ?? '',
      paymentNote: r.payment_note ?? '',
      paymentReceived: r.payment_received === 1,
      status: r.status,
      note: r.note ?? '',
      createdAt: r.created_at,
    }));
    return res.status(200).json(orders);
  }

  if (req.method === 'POST') {
    const o = req.body;
    await db.execute({
      sql: `INSERT INTO orders
              (id, date, client_id, product_name, contractors, sale_amount,
               payment_receiver_id, payment_note, payment_received, status, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              date=excluded.date, client_id=excluded.client_id,
              product_name=excluded.product_name, contractors=excluded.contractors,
              sale_amount=excluded.sale_amount, payment_receiver_id=excluded.payment_receiver_id,
              payment_note=excluded.payment_note, payment_received=excluded.payment_received,
              status=excluded.status, note=excluded.note`,
      args: [
        o.id, o.date, o.clientId, o.productName,
        JSON.stringify(o.contractors ?? []),
        o.saleAmount ?? 0,
        o.paymentReceiverId ?? '', o.paymentNote ?? '',
        o.paymentReceived ? 1 : 0,
        o.status ?? 'active', o.note ?? '', o.createdAt,
      ],
    });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    await db.execute({ sql: 'DELETE FROM orders WHERE id = ?', args: [id as string] });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

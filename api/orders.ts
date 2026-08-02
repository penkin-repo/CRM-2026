import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './db'

export default async function handler(req: VercelRequest, res: VercelResponse){
  const db = getDb()
  if(req.method==='GET'){
    const r = await db.execute('SELECT * FROM orders ORDER BY date DESC')
    const rows = r.rows.map(row=>({
      id: row.id,
      date: row.date,
      clientId: row.client_id,
      productName: row.product_name,
      contractors: JSON.parse(row.contractors as string || '[]'),
      saleAmount: row.sale_amount,
      saleFormula: (row as any).sale_formula || '',
      paymentReceiverId: row.payment_receiver_id,
      paymentNote: row.payment_note,
      paymentReceived: !!row.payment_received,
      status: row.status,
      note: row.note,
      createdAt: row.created_at
    }))
    return res.json(rows)
  }
  if(req.method==='POST'){
    const b = req.body
    await db.execute({
      sql: `INSERT INTO orders (id,date,client_id,product_name,contractors,sale_amount,sale_formula,payment_receiver_id,payment_note,payment_received,status,note,created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET date=excluded.date, client_id=excluded.client_id, product_name=excluded.product_name, contractors=excluded.contractors, sale_amount=excluded.sale_amount, sale_formula=excluded.sale_formula, payment_receiver_id=excluded.payment_receiver_id, payment_note=excluded.payment_note, payment_received=excluded.payment_received, status=excluded.status, note=excluded.note`,
      args: [b.id,b.date,b.clientId,b.productName||'',JSON.stringify(b.contractors||[]),b.saleAmount||0,b.saleFormula||'',b.paymentReceiverId||'',b.paymentNote||'',b.paymentReceived?1:0,b.status||'active',b.note||'',b.createdAt]
    })
    return res.json({ok:true})
  }
  if(req.method==='DELETE'){
    const id = req.query.id as string
    await db.execute({sql:'DELETE FROM orders WHERE id=?', args:[id]})
    return res.json({ok:true})
  }
  res.status(405).end()
}

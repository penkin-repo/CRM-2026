import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './db.js'
import { verifyAuth } from './auth-helper.js'

export default async function handler(req: VercelRequest, res: VercelResponse){
  res.setHeader('Content-Type', 'application/json')
  
  const auth = verifyAuth(req)
  if (!auth.valid) {
    return res.status(401).json({ ok: false, error: 'Неавторизованный доступ (требуется сессионный токен)' })
  }

  try {
    const db = await getDb()
    if (!db) {
      return res.status(200).json([])
    }

    if (req.method === 'GET') {
      const userId = req.query.userId as string
      let sql = 'SELECT * FROM orders ORDER BY date DESC'
      let args: any[] = []
      if (userId && userId !== 'usr_admin' && userId !== 'all') {
        sql = "SELECT * FROM orders WHERE user_id = ? OR user_id = '' ORDER BY date DESC"
        args = [userId]
      }
      const r = await db.execute({ sql, args })
      const rows = r.rows.map((row: any) => {
        let parsedContractors = []
        try {
          if (typeof row.contractors === 'string') {
            parsedContractors = JSON.parse(row.contractors || '[]')
          } else if (Array.isArray(row.contractors)) {
            parsedContractors = row.contractors
          }
        } catch {}

        return {
          id: String(row.id ?? ''),
          date: String(row.date ?? ''),
          clientId: String(row.client_id ?? ''),
          productName: String(row.product_name ?? ''),
          contractors: Array.isArray(parsedContractors) ? parsedContractors : [],
          saleAmount: Number(row.sale_amount ?? 0),
          saleFormula: String(row.sale_formula ?? ''),
          paymentReceiverId: String(row.payment_receiver_id ?? ''),
          paymentNote: String(row.payment_note ?? ''),
          paymentReceived: Boolean(Number(row.payment_received ?? 0)),
          status: String(row.status ?? 'active'),
          note: String(row.note ?? ''),
          createdAt: String(row.created_at ?? ''),
          userId: String(row.user_id ?? '')
        }
      })
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      let b = req.body
      if (typeof b === 'string') { try { b = JSON.parse(b) } catch {} }
      const contractorsStr = typeof b.contractors === 'string' ? b.contractors : JSON.stringify(b.contractors || [])
      await db.execute({
        sql: `INSERT INTO orders (id,date,client_id,product_name,contractors,sale_amount,sale_formula,payment_receiver_id,payment_note,payment_received,status,note,created_at,user_id)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET date=excluded.date, client_id=excluded.client_id, product_name=excluded.product_name, contractors=excluded.contractors, sale_amount=excluded.sale_amount, sale_formula=excluded.sale_formula, payment_receiver_id=excluded.payment_receiver_id, payment_note=excluded.payment_note, payment_received=excluded.payment_received, status=excluded.status, note=excluded.note, user_id=excluded.user_id`,
        args: [String(b.id), String(b.date||''), String(b.clientId||''), String(b.productName||''), contractorsStr, Number(b.saleAmount||0), String(b.saleFormula||''), String(b.paymentReceiverId||''), String(b.paymentNote||''), b.paymentReceived ? 1 : 0, String(b.status||'active'), String(b.note||''), String(b.createdAt||new Date().toISOString()), String(b.userId||'')]
      })
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      const id = req.query.id as string
      await db.execute({ sql: 'DELETE FROM orders WHERE id=?', args: [String(id)] })
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ ok: false, error: 'Method Not Allowed' })
  } catch (err: any) {
    console.error('Orders API error:', err)
    if (req.method === 'GET') return res.status(200).json([])
    return res.status(500).json({ ok: false, error: err?.message || String(err) })
  }
}

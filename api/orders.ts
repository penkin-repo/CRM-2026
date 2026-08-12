import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, ensureTables } from './db'

export default async function handler(req: VercelRequest, res: VercelResponse){
  try {
    const db = await getDb()
    if (!db) return res.json([])
    await ensureTables(db)

    if(req.method==='GET'){
      const userId = req.query.userId as string
      let sql = 'SELECT * FROM orders ORDER BY date DESC'
      let args: any[] = []
      if(userId && userId !== 'usr_admin' && userId !== 'all') {
        sql = "SELECT * FROM orders WHERE user_id = ? OR user_id = '' ORDER BY date DESC"
        args = [userId]
      }
      const r = await db.execute({ sql, args })
      const rows = r.rows.map(row => {
        let parsedContractors = []
        try {
          parsedContractors = typeof row.contractors === 'string' ? JSON.parse(row.contractors || '[]') : (row.contractors || [])
        } catch {}

        return {
          id: row.id,
          date: row.date,
          clientId: row.client_id,
          productName: row.product_name,
          contractors: Array.isArray(parsedContractors) ? parsedContractors : [],
          saleAmount: row.sale_amount,
          saleFormula: (row as any).sale_formula || '',
          paymentReceiverId: row.payment_receiver_id,
          paymentNote: row.payment_note,
          paymentReceived: !!row.payment_received,
          status: row.status,
          note: row.note,
          createdAt: row.created_at,
          userId: (row as any).user_id || ''
        }
      })
      return res.json(rows)
    }
    if(req.method==='POST'){
      let b = req.body
      if (typeof b === 'string') { try { b = JSON.parse(b) } catch {} }
      const contractorsStr = typeof b.contractors === 'string' ? b.contractors : JSON.stringify(b.contractors || [])
      await db.execute({
        sql: `INSERT INTO orders (id,date,client_id,product_name,contractors,sale_amount,sale_formula,payment_receiver_id,payment_note,payment_received,status,note,created_at,user_id)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET date=excluded.date, client_id=excluded.client_id, product_name=excluded.product_name, contractors=excluded.contractors, sale_amount=excluded.sale_amount, sale_formula=excluded.sale_formula, payment_receiver_id=excluded.payment_receiver_id, payment_note=excluded.payment_note, payment_received=excluded.payment_received, status=excluded.status, note=excluded.note, user_id=excluded.user_id`,
        args: [b.id, b.date||'', b.clientId||'', b.productName||'', contractorsStr, b.saleAmount||0, b.saleFormula||'', b.paymentReceiverId||'', b.paymentNote||'', b.paymentReceived?1:0, b.status||'active', b.note||'', b.createdAt||new Date().toISOString(), b.userId||'']
      })
      return res.json({ok:true})
    }
    if(req.method==='DELETE'){
      const id = req.query.id as string
      await db.execute({sql:'DELETE FROM orders WHERE id=?', args:[id]})
      return res.json({ok:true})
    }
    res.status(405).end()
  } catch (err: any) {
    console.error('Orders API error:', err)
    if (req.method === 'GET') return res.json([])
    return res.status(500).json({ ok: false, error: err.message })
  }
}

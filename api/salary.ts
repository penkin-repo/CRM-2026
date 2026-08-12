import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './db'

export default async function handler(req: VercelRequest, res: VercelResponse){
  res.setHeader('Content-Type', 'application/json')
  try {
    const db = await getDb()
    if (!db) return res.status(200).json([])

    if (req.method === 'GET') {
      const r = await db.execute('SELECT * FROM salary_records ORDER BY month DESC')
      const rows = r.rows.map(row => {
        let parsedPayerAdj = []
        let parsedHist = []
        try { parsedPayerAdj = typeof row.payer_adjustments === 'string' ? JSON.parse(row.payer_adjustments || '[]') : (row.payer_adjustments || []) } catch {}
        try { parsedHist = typeof row.history === 'string' ? JSON.parse(row.history || '[]') : (row.history || []) } catch {}
        return {
          id: row.id,
          month: row.month,
          salaryPercent: row.salary_percent,
          baseSalary: row.base_salary,
          payerAdjustments: parsedPayerAdj,
          totalAdjustment: row.total_adjustment,
          finalSalary: row.final_salary,
          paidAmount: row.paid_amount,
          closedAt: row.closed_at,
          note: row.note,
          history: parsedHist
        }
      })
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      let b = req.body
      if (typeof b === 'string') { try { b = JSON.parse(b) } catch {} }
      const payerAdjStr = typeof b.payerAdjustments === 'string' ? b.payerAdjustments : JSON.stringify(b.payerAdjustments || [])
      const historyStr = typeof b.history === 'string' ? b.history : JSON.stringify(b.history || [])
      await db.execute({
        sql: `INSERT INTO salary_records (id,month,salary_percent,base_salary,payer_adjustments,total_adjustment,final_salary,paid_amount,closed_at,note,history)
              VALUES (?,?,?,?,?,?,?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET month=excluded.month, salary_percent=excluded.salary_percent, base_salary=excluded.base_salary, payer_adjustments=excluded.payer_adjustments, total_adjustment=excluded.total_adjustment, final_salary=excluded.final_salary, paid_amount=excluded.paid_amount, closed_at=excluded.closed_at, note=excluded.note, history=excluded.history`,
        args: [b.id, b.month||'', b.salaryPercent||60, b.baseSalary||0, payerAdjStr, b.totalAdjustment||0, b.finalSalary||0, b.paidAmount||0, b.closedAt||null, b.note||'', historyStr]
      })
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      await db.execute({ sql: 'DELETE FROM salary_records WHERE id=?', args: [req.query.id as string] })
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ ok: false, error: 'Method Not Allowed' })
  } catch (err: any) {
    console.error('Salary API error:', err)
    if (req.method === 'GET') return res.status(200).json([])
    return res.status(500).json({ ok: false, error: err.message })
  }
}

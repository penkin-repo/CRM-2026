import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, ensureTables } from './db'

export default async function handler(req: VercelRequest, res: VercelResponse){
  try {
    const db = await getDb()
    if (!db) return res.json([])
    await ensureTables(db)

    if(req.method==='GET'){
      const r=await db.execute('SELECT * FROM salary_records ORDER BY month DESC')
      return res.json(r.rows.map(row=>({
        id:row.id, month:row.month, salaryPercent:row.salary_percent, baseSalary:row.base_salary,
        payerAdjustments: JSON.parse(row.payer_adjustments as string||'[]'),
        totalAdjustment: row.total_adjustment, finalSalary: row.final_salary, paidAmount: row.paid_amount,
        closedAt: row.closed_at, note: row.note, history: JSON.parse(row.history as string||'[]')
      })))
    }
    if(req.method==='POST'){
      let b=req.body
      if (typeof b === 'string') { try { b = JSON.parse(b) } catch {} }
      await db.execute({
        sql:`INSERT INTO salary_records (id,month,salary_percent,base_salary,payer_adjustments,total_adjustment,final_salary,paid_amount,closed_at,note,history)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)
             ON CONFLICT(id) DO UPDATE SET month=excluded.month, salary_percent=excluded.salary_percent, base_salary=excluded.base_salary, payer_adjustments=excluded.payer_adjustments, total_adjustment=excluded.total_adjustment, final_salary=excluded.final_salary, paid_amount=excluded.paid_amount, closed_at=excluded.closed_at, note=excluded.note, history=excluded.history`,
        args:[b.id,b.month,b.salaryPercent||60,b.baseSalary||0,JSON.stringify(b.payerAdjustments||[]),b.totalAdjustment||0,b.finalSalary||0,b.paidAmount||0,b.closedAt||null,b.note||'',JSON.stringify(b.history||[])]
      })
      return res.json({ok:true})
    }
    if(req.method==='DELETE'){
      await db.execute({sql:'DELETE FROM salary_records WHERE id=?', args:[req.query.id as string]})
      return res.json({ok:true})
    }
    res.status(405).end()
  } catch (err: any) {
    console.error('Salary API error:', err)
    if (req.method === 'GET') return res.json([])
    return res.status(500).json({ ok: false, error: err.message })
  }
}


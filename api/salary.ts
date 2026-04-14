import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const db = getDb();

  if (req.method === 'GET') {
    const result = await db.execute('SELECT * FROM salary_records ORDER BY month DESC');
    const records = result.rows.map(r => ({
      id: r.id,
      month: r.month,
      salaryPercent: r.salary_percent,
      baseSalary: r.base_salary,
      payerAdjustments: JSON.parse((r.payer_adjustments as string) ?? '[]'),
      totalAdjustment: r.total_adjustment,
      finalSalary: r.final_salary,
      paidAmount: r.paid_amount,
      closedAt: r.closed_at ?? null,
      note: r.note ?? '',
      history: JSON.parse((r.history as string) ?? '[]'),
    }));
    return res.status(200).json(records);
  }

  if (req.method === 'POST') {
    const s = req.body;
    await db.execute({
      sql: `INSERT INTO salary_records
              (id, month, salary_percent, base_salary, payer_adjustments,
               total_adjustment, final_salary, paid_amount, closed_at, note, history)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              month=excluded.month, salary_percent=excluded.salary_percent,
              base_salary=excluded.base_salary, payer_adjustments=excluded.payer_adjustments,
              total_adjustment=excluded.total_adjustment, final_salary=excluded.final_salary,
              paid_amount=excluded.paid_amount, closed_at=excluded.closed_at,
              note=excluded.note, history=excluded.history`,
      args: [
        s.id, s.month, s.salaryPercent ?? 60, s.baseSalary ?? 0,
        JSON.stringify(s.payerAdjustments ?? []),
        s.totalAdjustment ?? 0, s.finalSalary ?? 0, s.paidAmount ?? 0,
        s.closedAt ?? null, s.note ?? '',
        JSON.stringify(s.history ?? []),
      ],
    });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    await db.execute({ sql: 'DELETE FROM salary_records WHERE id = ?', args: [id as string] });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

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
    if (!db) return res.status(200).json([])

    if (req.method === 'GET') {
      const userId = req.query.userId as string
      let sql = 'SELECT * FROM contractors ORDER BY created_at'
      let args: any[] = []
      if (userId && userId !== 'all') {
        sql = "SELECT * FROM contractors WHERE user_id = ? OR user_id = '' ORDER BY created_at"
        args = [userId]
      }
      const r = await db.execute({ sql, args })
      return res.status(200).json(r.rows.map((row: any) => ({
        id: String(row.id ?? ''),
        name: String(row.name ?? ''),
        phone: String(row.phone ?? ''),
        note: String(row.note ?? ''),
        createdAt: String(row.created_at ?? ''),
        userId: String(row.user_id ?? '')
      })))
    }

    if (req.method === 'POST') {
      let b = req.body
      if (typeof b === 'string') { try { b = JSON.parse(b) } catch {} }
      await db.execute({
        sql: `INSERT INTO contractors (id,name,phone,note,created_at,user_id) VALUES (?,?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET name=excluded.name, phone=excluded.phone, note=excluded.note, user_id=excluded.user_id`,
        args: [String(b.id), String(b.name||''), String(b.phone||''), String(b.note||''), String(b.createdAt||new Date().toISOString()), String(b.userId||'usr_alex')]
      })
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      await db.execute({ sql: 'DELETE FROM contractors WHERE id=?', args: [String(req.query.id as string)] })
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ ok: false, error: 'Method Not Allowed' })
  } catch (err: any) {
    console.error('Contractors API error:', err)
    if (req.method === 'GET') return res.status(200).json([])
    return res.status(500).json({ ok: false, error: err?.message || String(err) })
  }
}

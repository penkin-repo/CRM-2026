import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './db'

export default async function handler(req: VercelRequest, res: VercelResponse){
  res.setHeader('Content-Type', 'application/json')
  try {
    const db = await getDb()
    if (!db) return res.status(200).json([])

    if (req.method === 'GET') {
      const r = await db.execute('SELECT id, username, password, name, role, created_at FROM users ORDER BY created_at')
      return res.status(200).json(r.rows.map(row => ({
        id: row.id,
        username: row.username,
        password: row.password,
        name: row.name,
        role: row.role || 'user',
        createdAt: row.created_at
      })))
    }

    if (req.method === 'POST') {
      let b = req.body
      if (typeof b === 'string') { try { b = JSON.parse(b) } catch {} }
      await db.execute({
        sql: `INSERT INTO users (id, username, password, name, role, created_at) VALUES (?,?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET username=excluded.username, password=excluded.password, name=excluded.name, role=excluded.role`,
        args: [b.id, b.username, b.password, b.name, b.role || 'user', b.createdAt || new Date().toISOString()]
      })
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      const id = req.query.id as string
      await db.execute({ sql: 'DELETE FROM users WHERE id=?', args: [id] })
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ ok: false, error: 'Method Not Allowed' })
  } catch (err: any) {
    console.error('Users API error:', err)
    if (req.method === 'GET') return res.status(200).json([])
    return res.status(500).json({ ok: false, error: err.message })
  }
}

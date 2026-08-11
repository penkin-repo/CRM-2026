import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, ensureTables } from './db'

export default async function handler(req: VercelRequest, res: VercelResponse){
  try {
    const db = getDb()
    if (!db) return res.json([])
    await ensureTables(db)

    if(req.method==='GET'){
      const r = await db.execute('SELECT id, username, password, name, role, created_at FROM users ORDER BY created_at')
      return res.json(r.rows.map(row=>({
        id: row.id,
        username: row.username,
        password: row.password,
        name: row.name,
        role: row.role || 'user',
        createdAt: row.created_at
      })))
    }
    if(req.method==='POST'){
      let b = req.body
      if (typeof b === 'string') { try { b = JSON.parse(b) } catch {} }
      await db.execute({
        sql: `INSERT INTO users (id, username, password, name, role, created_at) VALUES (?,?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET username=excluded.username, password=excluded.password, name=excluded.name, role=excluded.role`,
        args: [b.id, b.username, b.password, b.name, b.role || 'user', b.createdAt || new Date().toISOString()]
      })
      return res.json({ok:true})
    }
    if(req.method==='DELETE'){
      const id = req.query.id as string
      await db.execute({sql:'DELETE FROM users WHERE id=?', args:[id]})
      return res.json({ok:true})
    }
    res.status(405).end()
  } catch (err: any) {
    console.error('Users API error:', err)
    if (req.method === 'GET') return res.json([])
    return res.status(500).json({ ok: false, error: err.message })
  }
}


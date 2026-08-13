import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, ensureTables } from './db.js'
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
    await ensureTables(db)

    if (req.method === 'GET') {
      const r = await db.execute('SELECT id, username, password, name, role, created_at FROM users ORDER BY created_at')
      return res.status(200).json(r.rows.map((row: any) => ({
        id: String(row.id ?? ''),
        username: String(row.username ?? ''),
        password: String(row.password ?? ''),
        name: String(row.name ?? ''),
        role: String(row.role ?? 'user'),
        createdAt: String(row.created_at ?? '')
      })))
    }

    if (req.method === 'POST') {
      let b = req.body
      if (typeof b === 'string') { try { b = JSON.parse(b) } catch {} }
      await db.execute({
        sql: `INSERT INTO users (id, username, password, name, role, created_at) VALUES (?,?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET username=excluded.username, password=excluded.password, name=excluded.name, role=excluded.role`,
        args: [String(b.id), String(b.username||''), String(b.password||''), String(b.name||''), String(b.role||'user'), String(b.createdAt||new Date().toISOString())]
      })
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || '')
      if (!id) return res.status(400).json({ ok: false, error: 'User ID is required' })

      // Never delete data! Re-assign all orders, clients, contractors, payers to usr_alex
      try { await db.execute({ sql: "UPDATE orders SET user_id = 'usr_alex' WHERE user_id = ?", args: [id] }) } catch {}
      try { await db.execute({ sql: "UPDATE clients SET user_id = 'usr_alex' WHERE user_id = ?", args: [id] }) } catch {}
      try { await db.execute({ sql: "UPDATE contractors SET user_id = 'usr_alex' WHERE user_id = ?", args: [id] }) } catch {}
      try { await db.execute({ sql: "UPDATE payers SET user_id = 'usr_alex' WHERE user_id = ?", args: [id] }) } catch {}

      // Delete user account
      await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] })
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ ok: false, error: 'Method Not Allowed' })
  } catch (err: any) {
    console.error('Users API error:', err)
    if (req.method === 'GET') return res.status(200).json([])
    return res.status(500).json({ ok: false, error: err?.message || String(err) })
  }
}

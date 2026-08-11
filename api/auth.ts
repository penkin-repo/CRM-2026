import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './db'

const DEMO_USERS: Record<string, { pass: string; user: any }> = {
  admin: { pass: process.env.APP_PASSWORD || 'admin', user: { id: 'usr_admin', username: 'admin', name: 'Администратор', role: 'admin' } },
  alex: { pass: 'alex123', user: { id: 'usr_alex', username: 'alex', name: 'Алексей', role: 'user' } },
  manager: { pass: 'manager123', user: { id: 'usr_manager', username: 'manager', name: 'Мария', role: 'user' } }
}

export default async function handler(req: VercelRequest, res: VercelResponse){
  if(req.method!=='POST') return res.status(405).end()
  const { username, password } = req.body || {}
  
  if(!username || !password) {
    return res.status(400).json({ ok: false, error: 'Логин и пароль обязательны' })
  }

  const uLower = String(username).trim().toLowerCase()

  try {
    const db = getDb()
    const r = await db.execute({
      sql: 'SELECT id, username, name, role FROM users WHERE LOWER(username) = LOWER(?) AND password = ?',
      args: [String(username).trim(), String(password)]
    })

    if(r.rows.length > 0) {
      const u = r.rows[0]
      return res.status(200).json({
        ok: true,
        user: {
          id: String(u.id),
          username: String(u.username),
          name: String(u.name),
          role: String(u.role || 'user')
        }
      })
    }

    // Checking demo fallback accounts if not found in DB
    const foundDemo = DEMO_USERS[uLower]
    if(foundDemo && foundDemo.pass === String(password)) {
      return res.status(200).json({ ok: true, user: foundDemo.user })
    }

    return res.status(401).json({ ok: false, error: 'Неверный логин или пароль' })
  } catch (e: any) {
    console.error('Auth error:', e)
    // Fallback if DB is unavailable / TURSO env missing on Vercel
    const foundDemo = DEMO_USERS[uLower]
    if(foundDemo && foundDemo.pass === String(password)) {
      return res.status(200).json({ ok: true, user: foundDemo.user })
    }
    return res.status(401).json({ ok: false, error: 'Неверный логин или пароль' })
  }
}


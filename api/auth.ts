import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './db'

export default async function handler(req: VercelRequest, res: VercelResponse){
  if(req.method!=='POST') return res.status(405).end()
  const { username, password } = req.body || {}
  
  if(!username || !password) {
    return res.status(400).json({ ok: false, error: 'Логин и пароль обязательны' })
  }

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

    // Checking if matches default APP_PASSWORD for fallback admin
    const envPass = process.env.APP_PASSWORD || 'admin'
    if(username.toLowerCase() === 'admin' && password === envPass) {
      return res.status(200).json({
        ok: true,
        user: { id: 'usr_admin', username: 'admin', name: 'Администратор', role: 'admin' }
      })
    }

    return res.status(401).json({ ok: false, error: 'Неверный логин или пароль' })
  } catch (e: any) {
    console.error('Auth error:', e)
    const envPass = process.env.APP_PASSWORD || 'admin'
    if(password === envPass) {
      return res.status(200).json({
        ok: true,
        user: { id: 'usr_admin', username: username || 'admin', name: 'Администратор', role: 'admin' }
      })
    }
    return res.status(500).json({ ok: false, error: e.message })
  }
}

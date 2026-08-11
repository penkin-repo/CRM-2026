import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './db'

export default async function handler(req: VercelRequest, res: VercelResponse){
  if(req.method!=='POST') return res.status(405).end()
  const { username, password } = req.body || {}
  
  if(!username || !password) {
    return res.status(400).json({ ok: false, error: 'Логин и пароль обязательны' })
  }

  const uClean = String(username).trim()
  const uLower = uClean.toLowerCase()
  const passStr = String(password).trim()

  const allowedPasswords = new Set([
    'alex123',
    'alex',
    'admin',
    (process.env.APP_PASSWORD || '').trim()
  ].filter(Boolean))

  try {
    const db = getDb()
    const r = await db.execute({
      sql: 'SELECT id, username, name, role FROM users WHERE LOWER(username) = LOWER(?) AND password = ?',
      args: [uClean, passStr]
    })

    if(r.rows.length > 0) {
      const u = r.rows[0]
      return res.status(200).json({
        ok: true,
        user: {
          id: String(u.id),
          username: String(u.username),
          name: String(u.name || 'Алексей'),
          role: 'admin'
        }
      })
    }
  } catch (e: any) {
    console.error('Auth DB error:', e)
  }

  // Fallback check for user alex
  if(uLower === 'alex' && allowedPasswords.has(passStr)) {
    return res.status(200).json({
      ok: true,
      user: { id: 'usr_alex', username: 'alex', name: 'Алексей', role: 'admin' }
    })
  }

  return res.status(401).json({ ok: false, error: 'Неверный логин или пароль' })
}




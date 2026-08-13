import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, ensureTables } from './db.js'
import { generateToken } from './auth-helper.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json')

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' })
    }

    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch {}
    }
    const { username, password } = body || {}

    const uClean = String(username || '').trim()
    const passStr = String(password || '').trim()

    if (!uClean || !passStr) {
      return res.status(400).json({ ok: false, error: 'Заполните логин и пароль' })
    }

    const db = await getDb()
    if (!db) {
      return res.status(503).json({ ok: false, error: 'База данных недоступна. Проверьте переменные окружения TURSO_DATABASE_URL и TURSO_AUTH_TOKEN' })
    }

    await ensureTables(db)

    // Authenticate strictly against the database
    const r = await db.execute({
      sql: 'SELECT id, username, name, role FROM users WHERE LOWER(username) = LOWER(?) AND password = ?',
      args: [uClean, passStr]
    })

    if (r.rows.length > 0) {
      const u = r.rows[0]
      const user = {
        id: String(u.id),
        username: String(u.username),
        name: String(u.name || u.username),
        role: String(u.role || 'user')
      }

      const token = generateToken(user)

      return res.status(200).json({
        ok: true,
        user,
        token
      })
    }

    return res.status(401).json({ ok: false, error: 'Неверный логин или пароль' })
  } catch (err: any) {
    console.error('Server Auth Error:', err)
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Внутренняя ошибка сервера при авторизации'
    })
  }
}

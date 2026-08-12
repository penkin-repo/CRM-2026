import type { VercelRequest, VercelResponse } from '@vercel/node'

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
    const uLower = uClean.toLowerCase()
    const passStr = String(password || '').trim()

    if (!uClean || !passStr) {
      return res.status(400).json({ ok: false, error: 'Заполните логин и пароль' })
    }

    // 1. Direct local authentication for superadmin account
    if (uLower === 'admin' && passStr === 'admin') {
      return res.status(200).json({
        ok: true,
        user: { id: 'usr_admin', username: 'admin', name: 'Главный Администратор', role: 'admin' }
      })
    }

    // 2. Direct local authentication for alex (Manager role)
    if (uLower === 'alex' && (passStr === 'alex123' || passStr === 'alex')) {
      return res.status(200).json({
        ok: true,
        user: { id: 'usr_alex', username: 'alex', name: 'Алексей (Менеджер)', role: 'user' }
      })
    }

    // 3. Optional Turso database check
    if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
      try {
        const { createClient } = await import('@libsql/client/web')
        const url = process.env.TURSO_DATABASE_URL
        const token = process.env.TURSO_AUTH_TOKEN
        const resolvedUrl = url.startsWith('libsql://') ? url.replace('libsql://', 'https://') : url
        const db = createClient({ url: resolvedUrl, authToken: token })

        const r = await db.execute({
          sql: 'SELECT id, username, name, role FROM users WHERE LOWER(username) = LOWER(?) AND password = ?',
          args: [uClean, passStr]
        })

        if (r.rows.length > 0) {
          const u = r.rows[0]
          return res.status(200).json({
            ok: true,
            user: {
              id: String(u.id),
              username: String(u.username),
              name: String(u.name || u.username),
              role: String(u.role || 'user')
            }
          })
        }
      } catch (dbErr: any) {
        console.error('Turso DB Auth Error:', dbErr)
      }
    }

    return res.status(401).json({ ok: false, error: 'Неверный логин или пароль' })
  } catch (err: any) {
    console.error('Server Auth Error:', err)
    // Emergency fallback: default to Alex (Manager)
    return res.status(200).json({
      ok: true,
      user: { id: 'usr_alex', username: 'alex', name: 'Алексей (Менеджер)', role: 'user' }
    })
  }
}

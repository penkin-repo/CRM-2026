import type { VercelRequest, VercelResponse } from '@vercel/node'

async function getDb() {
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN
  if (!url || !token) return null
  try {
    const { createClient } = await import('@libsql/client/web')
    const resolvedUrl = url.startsWith('libsql://') ? url.replace('libsql://', 'https://') : url
    return createClient({ url: resolvedUrl, authToken: token })
  } catch (e) {
    console.error('Failed to create Turso client:', e)
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse){
  res.setHeader('Content-Type', 'application/json')
  try {
    const db = await getDb()
    if (!db) return res.status(200).json([])

    if (req.method === 'GET') {
      const userId = req.query.userId as string
      let sql = 'SELECT * FROM payers ORDER BY created_at'
      let args: any[] = []
      if (userId && userId !== 'all') {
        sql = "SELECT * FROM payers WHERE user_id = ? OR user_id = '' ORDER BY created_at"
        args = [userId]
      }
      const r = await db.execute({ sql, args })
      return res.status(200).json(r.rows.map((row: any) => ({
        id: String(row.id ?? ''),
        name: String(row.name ?? ''),
        type: String(row.type ?? 'cashless'),
        createdAt: String(row.created_at ?? ''),
        userId: String(row.user_id ?? '')
      })))
    }

    if (req.method === 'POST') {
      let b = req.body
      if (typeof b === 'string') { try { b = JSON.parse(b) } catch {} }
      await db.execute({
        sql: `INSERT INTO payers (id,name,type,created_at,user_id) VALUES (?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, user_id=excluded.user_id`,
        args: [String(b.id), String(b.name||''), String(b.type||'cashless'), String(b.createdAt||new Date().toISOString()), String(b.userId||'usr_alex')]
      })
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      await db.execute({ sql: 'DELETE FROM payers WHERE id=?', args: [String(req.query.id as string)] })
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ ok: false, error: 'Method Not Allowed' })
  } catch (err: any) {
    console.error('Payers API error:', err)
    if (req.method === 'GET') return res.status(200).json([])
    return res.status(500).json({ ok: false, error: err?.message || String(err) })
  }
}

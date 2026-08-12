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
      const r = await db.execute('SELECT * FROM history ORDER BY timestamp DESC LIMIT 50')
      const rows = r.rows.map((row: any) => {
        let parsedSnapshot = row.snapshot
        if (typeof row.snapshot === 'string') {
          try { parsedSnapshot = JSON.parse(row.snapshot) } catch {}
        }
        return {
          id: String(row.id ?? ''),
          timestamp: String(row.timestamp ?? ''),
          action: String(row.action ?? ''),
          description: String(row.description ?? ''),
          snapshot: parsedSnapshot,
          userId: String((row as any).user_id ?? '')
        }
      })
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      let b = req.body
      if (typeof b === 'string') { try { b = JSON.parse(b) } catch {} }
      const snapshotStr = typeof b.snapshot === 'string' ? b.snapshot : JSON.stringify(b.snapshot || {})
      await db.execute({
        sql: `INSERT INTO history (id,timestamp,action,description,snapshot,user_id) VALUES (?,?,?,?,?,?)`,
        args: [String(b.id), String(b.timestamp||''), String(b.action||''), String(b.description||''), snapshotStr, String(b.userId||'')]
      })
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      await db.execute('DELETE FROM history')
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ ok: false, error: 'Method Not Allowed' })
  } catch (err: any) {
    console.error('History API error:', err)
    if (req.method === 'GET') return res.status(200).json([])
    return res.status(500).json({ ok: false, error: err?.message || String(err) })
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './db'

export default async function handler(req: VercelRequest, res: VercelResponse){
  res.setHeader('Content-Type', 'application/json')
  try {
    const db = await getDb()
    if (!db) return res.status(200).json([])

    if (req.method === 'GET') {
      const r = await db.execute('SELECT * FROM history ORDER BY timestamp DESC LIMIT 50')
      const rows = r.rows.map(row => {
        let parsedSnapshot = row.snapshot
        if (typeof row.snapshot === 'string') {
          try { parsedSnapshot = JSON.parse(row.snapshot) } catch {}
        }
        return {
          id: row.id,
          timestamp: row.timestamp,
          action: row.action,
          description: row.description,
          snapshot: parsedSnapshot,
          userId: (row as any).user_id || ''
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
        args: [b.id, b.timestamp||'', b.action||'', b.description||'', snapshotStr, b.userId||'']
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
    return res.status(500).json({ ok: false, error: err.message })
  }
}

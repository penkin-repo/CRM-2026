import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './db.js'
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

    if (req.method === 'GET') {
      const limit = Math.min(Math.max(Number(req.query.limit || 150), 1), 500)
      const r = await db.execute({
        sql: `SELECT * FROM history ORDER BY timestamp DESC LIMIT ?`,
        args: [limit]
      })
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
      const rawEntries = Array.isArray(b) ? b : (Array.isArray(b?.entries) ? b.entries : (b ? [b] : []))
      const entries = rawEntries.filter(Boolean)
      if (entries.length === 0) {
        return res.status(200).json({ ok: true, count: 0 })
      }

      const statements = entries.map((entry: any) => {
        let snapshotStr = '{}'
        try {
          snapshotStr = typeof entry.snapshot === 'string' ? entry.snapshot : JSON.stringify(entry.snapshot || {})
          if (snapshotStr.length > 500000) {
            snapshotStr = JSON.stringify({ note: 'Snapshot omitted due to size' })
          }
        } catch {}
        return {
          sql: `INSERT OR REPLACE INTO history (id, timestamp, action, description, snapshot, user_id) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            String(entry.id || Math.random().toString(36).slice(2, 8)),
            String(entry.timestamp || new Date().toLocaleString('ru-RU')),
            String(entry.action || ''),
            String(entry.description || ''),
            snapshotStr,
            String(entry.userId || '')
          ]
        }
      })

      const chunkSize = 25
      for (let i = 0; i < statements.length; i += chunkSize) {
        const chunk = statements.slice(i, i + chunkSize)
        if (typeof (db as any).batch === 'function') {
          await (db as any).batch(chunk, 'write')
        } else {
          for (const s of chunk) {
            await db.execute(s)
          }
        }
      }

      // Automatically keep the latest 150 entries in DB
      try {
        await db.execute(`
          DELETE FROM history WHERE id NOT IN (
            SELECT id FROM history ORDER BY timestamp DESC LIMIT 150
          )
        `)
      } catch {}

      return res.status(200).json({ ok: true, count: entries.length })
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

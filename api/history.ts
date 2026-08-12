import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, ensureTables } from './db'

export default async function handler(req: VercelRequest, res: VercelResponse){
  try {
    const db = await getDb()
    if (!db) return res.json([])
    await ensureTables(db)

    if(req.method==='GET'){
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
      return res.json(rows)
    }
    if(req.method==='POST'){
      let b = req.body
      if (typeof b === 'string') { try { b = JSON.parse(b) } catch {} }
      const snapshotStr = typeof b.snapshot === 'string' ? b.snapshot : JSON.stringify(b.snapshot || {})
      await db.execute({
        sql: `INSERT INTO history (id,timestamp,action,description,snapshot,user_id) VALUES (?,?,?,?,?,?)`,
        args: [b.id, b.timestamp||'', b.action||'', b.description||'', snapshotStr, b.userId||'']
      })
      return res.json({ok:true})
    }
    if(req.method==='DELETE'){
      await db.execute('DELETE FROM history')
      return res.json({ok:true})
    }
    res.status(405).end()
  } catch (err: any) {
    console.error('History API error:', err)
    if (req.method === 'GET') return res.json([])
    return res.status(500).json({ ok: false, error: err.message })
  }
}

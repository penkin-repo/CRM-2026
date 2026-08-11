import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, ensureTables } from './db'

export default async function handler(req: VercelRequest, res: VercelResponse){
  try {
    const db = getDb()
    if (!db) return res.json([])
    await ensureTables(db)

    if(req.method==='GET'){
      const r=await db.execute('SELECT * FROM history ORDER BY timestamp DESC LIMIT 50')
      return res.json(r.rows.map(row=>({ id:row.id, timestamp:row.timestamp, action:row.action, description:row.description, snapshot:row.snapshot })))
    }
    if(req.method==='POST'){
      let b=req.body
      if (typeof b === 'string') { try { b = JSON.parse(b) } catch {} }
      await db.execute({sql:`INSERT INTO history (id,timestamp,action,description,snapshot) VALUES (?,?,?,?,?)`, args:[b.id,b.timestamp,b.action,b.description,b.snapshot]})
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


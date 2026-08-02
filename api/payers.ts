import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './db'

export default async function handler(req: VercelRequest, res: VercelResponse){
  const db = getDb()
  if(req.method==='GET'){
    const r = await db.execute('SELECT * FROM payers ORDER BY created_at')
    return res.json(r.rows.map(row=>({ id: row.id, name: row.name, type: (row as any).type || 'cashless', createdAt: row.created_at })))
  }
  if(req.method==='POST'){
    const b = req.body
    // миграция колонки type если нужно
    try{ await db.execute('ALTER TABLE payers ADD COLUMN type TEXT DEFAULT "cashless"'); }catch{}
    await db.execute({
      sql: `INSERT INTO payers (id,name,type,created_at) VALUES (?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type`,
      args: [b.id,b.name,b.type||'cashless',b.createdAt]
    })
    return res.json({ok:true})
  }
  if(req.method==='DELETE'){
    await db.execute({sql:'DELETE FROM payers WHERE id=?', args:[req.query.id as string]})
    return res.json({ok:true})
  }
  res.status(405).end()
}

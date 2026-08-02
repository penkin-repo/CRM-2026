import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './db'

export default async function handler(req: VercelRequest, res: VercelResponse){
  const db=getDb()
  if(req.method==='GET'){
    const r=await db.execute('SELECT * FROM contractors ORDER BY created_at')
    return res.json(r.rows.map(row=>({ id:row.id, name:row.name, phone:row.phone, note:row.note, createdAt:row.created_at })))
  }
  if(req.method==='POST'){
    const b=req.body
    await db.execute({sql:`INSERT INTO contractors (id,name,phone,note,created_at) VALUES (?,?,?, ?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, phone=excluded.phone, note=excluded.note`, args:[b.id,b.name,b.phone||'',b.note||'',b.createdAt]})
    return res.json({ok:true})
  }
  if(req.method==='DELETE'){
    await db.execute({sql:'DELETE FROM contractors WHERE id=?', args:[req.query.id as string]})
    return res.json({ok:true})
  }
  res.status(405).end()
}

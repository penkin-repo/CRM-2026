import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, ensureTables } from './db'

export default async function handler(req: VercelRequest, res: VercelResponse){
  try {
    const db = getDb()
    if (!db) return res.json([])
    await ensureTables(db)

    if(req.method==='GET'){
      const r = await db.execute('SELECT * FROM clients ORDER BY created_at DESC')
      const rows = r.rows.map(row=>({
        id: row.id,
        name: row.name,
        phone: row.phone,
        contactPerson: row.contact_person,
        email: row.email,
        note: row.note,
        customFields: JSON.parse(row.custom_fields as string || '[]'),
        createdAt: row.created_at,
        type: (row as any).type || undefined
      }))
      return res.json(rows)
    }
    if(req.method==='POST'){
      let b = req.body
      if (typeof b === 'string') { try { b = JSON.parse(b) } catch {} }
      await db.execute({
        sql: `INSERT INTO clients (id,name,phone,contact_person,email,note,custom_fields,created_at) VALUES (?,?,?,?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET name=excluded.name, phone=excluded.phone, contact_person=excluded.contact_person, email=excluded.email, note=excluded.note, custom_fields=excluded.custom_fields`,
        args: [b.id, b.name, b.phone||'', b.contactPerson||'', b.email||'', b.note||'', JSON.stringify(b.customFields||[]), b.createdAt]
      })
      return res.json({ok:true})
    }
    if(req.method==='DELETE'){
      const id = req.query.id as string
      await db.execute({sql:'DELETE FROM clients WHERE id=?', args:[id]})
      return res.json({ok:true})
    }
    res.status(405).end()
  } catch (err: any) {
    console.error('Clients API error:', err)
    if (req.method === 'GET') return res.json([])
    return res.status(500).json({ ok: false, error: err.message })
  }
}


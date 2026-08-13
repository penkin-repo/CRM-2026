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
      const userId = req.query.userId as string
      let sql = 'SELECT * FROM clients ORDER BY created_at DESC'
      let args: any[] = []
      if (userId && userId !== 'all') {
        sql = "SELECT * FROM clients WHERE user_id = ? OR user_id = '' ORDER BY created_at DESC"
        args = [userId]
      }
      const r = await db.execute({ sql, args })
      const rows = r.rows.map((row: any) => {
        let parsedFields = []
        try {
          if (typeof row.custom_fields === 'string') {
            parsedFields = JSON.parse(row.custom_fields || '[]')
          } else if (Array.isArray(row.custom_fields)) {
            parsedFields = row.custom_fields
          }
        } catch {}

        return {
          id: String(row.id ?? ''),
          name: String(row.name ?? ''),
          phone: String(row.phone ?? ''),
          contactPerson: String(row.contact_person ?? ''),
          email: String(row.email ?? ''),
          note: String(row.note ?? ''),
          customFields: parsedFields,
          createdAt: String(row.created_at ?? ''),
          type: row.type ? String(row.type) : undefined,
          userId: String(row.user_id ?? '')
        }
      })
      return res.status(200).json(rows)
    }

    if (req.method === 'POST') {
      let b = req.body
      if (typeof b === 'string') { try { b = JSON.parse(b) } catch {} }
      const customFieldsStr = typeof b.customFields === 'string' ? b.customFields : JSON.stringify(b.customFields || [])
      await db.execute({
        sql: `INSERT INTO clients (id,name,phone,contact_person,email,note,custom_fields,created_at,user_id) VALUES (?,?,?,?,?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET name=excluded.name, phone=excluded.phone, contact_person=excluded.contact_person, email=excluded.email, note=excluded.note, custom_fields=excluded.custom_fields, user_id=excluded.user_id`,
        args: [String(b.id), String(b.name||''), String(b.phone||''), String(b.contactPerson||''), String(b.email||''), String(b.note||''), customFieldsStr, String(b.createdAt||new Date().toISOString()), String(b.userId||'usr_alex')]
      })
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      const id = req.query.id as string
      await db.execute({ sql: 'DELETE FROM clients WHERE id=?', args: [String(id)] })
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ ok: false, error: 'Method Not Allowed' })
  } catch (err: any) {
    console.error('Clients API error:', err)
    if (req.method === 'GET') return res.status(200).json([])
    return res.status(500).json({ ok: false, error: err?.message || String(err) })
  }
}

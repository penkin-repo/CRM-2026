import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json')

  const report: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL
        ? process.env.TURSO_DATABASE_URL.replace(/(?<=.{20}).+(?=.{10})/, '***')
        : 'MISSING',
      TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN
        ? 'SET (length=' + process.env.TURSO_AUTH_TOKEN.length + ')'
        : 'MISSING',
      NODE_ENV: process.env.NODE_ENV || 'unknown',
    },
    db: { status: 'not_tested', error: null as any, rowCount: null as any }
  }

  try {
    const url = process.env.TURSO_DATABASE_URL
    const token = process.env.TURSO_AUTH_TOKEN

    if (!url || !token) {
      report.db.status = 'skipped'
      report.db.error = 'Missing env vars'
    } else {
      const { createClient } = await import('@libsql/client/web')
      const resolvedUrl = url.startsWith('libsql://') ? url.replace('libsql://', 'https://') : url
      const db = createClient({ url: resolvedUrl, authToken: token })

      // Test connection
      const r = await db.execute('SELECT COUNT(*) as cnt FROM orders')
      report.db.status = 'ok'
      report.db.rowCount = Number(r.rows[0]?.cnt ?? 0)

      // Also check tables exist
      const tables = await db.execute(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
      report.db.tables = tables.rows.map((r: any) => r.name)
    }
  } catch (err: any) {
    report.db.status = 'error'
    report.db.error = err?.message || String(err)
    report.db.stack = err?.stack?.split('\n').slice(0, 5).join(' | ')
  }

  return res.status(200).json(report)
}

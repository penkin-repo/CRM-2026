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
    db: { status: 'not_tested', error: null as any }
  }

  try {
    const url = process.env.TURSO_DATABASE_URL
    const token = process.env.TURSO_AUTH_TOKEN
    if (!url || !token) { report.db.status = 'skipped'; report.db.error = 'Missing env vars'; return res.json(report) }

    const { createClient } = await import('@libsql/client/web')
    const resolvedUrl = url.startsWith('libsql://') ? url.replace('libsql://', 'https://') : url
    const db = createClient({ url: resolvedUrl, authToken: token })

    // 1. Count orders total
    const total = await db.execute('SELECT COUNT(*) as cnt FROM orders')
    report.db.totalOrders = Number(total.rows[0]?.cnt ?? 0)

    // 2. Orders by user_id
    const byUser = await db.execute('SELECT user_id, COUNT(*) as cnt FROM orders GROUP BY user_id')
    report.db.ordersByUser = byUser.rows.map((r: any) => ({ userId: r.user_id || '(empty)', count: Number(r.cnt) }))

    // 3. Orders by month
    const byMonth = await db.execute("SELECT substr(date,1,7) as month, COUNT(*) as cnt FROM orders GROUP BY substr(date,1,7) ORDER BY month DESC")
    report.db.ordersByMonth = byMonth.rows.map((r: any) => ({ month: r.month, count: Number(r.cnt) }))

    // 4. Test the actual usr_alex query (same as /api/orders?userId=usr_alex)
    try {
      const alexQ = await db.execute({
        sql: "SELECT id, date, user_id, product_name FROM orders WHERE user_id = ? OR user_id = '' ORDER BY date DESC",
        args: ['usr_alex']
      })
      report.db.alexOrders = alexQ.rows.map((r: any) => ({ id: r.id, date: r.date, userId: r.user_id, product: r.product_name }))
    } catch (e: any) {
      report.db.alexOrdersError = e?.message
    }

    // 5. Test contractors JSON parse for each order (common source of 500)
    try {
      const allOrders = await db.execute('SELECT id, contractors FROM orders')
      const parseErrors: string[] = []
      for (const row of allOrders.rows) {
        try { JSON.parse(row.contractors as string || '[]') } catch { parseErrors.push(String(row.id)) }
      }
      report.db.contractorsParseErrors = parseErrors.length > 0 ? parseErrors : 'none'
    } catch (e: any) {
      report.db.contractorsCheckError = e?.message
    }

    report.db.status = 'ok'
  } catch (err: any) {
    report.db.status = 'error'
    report.db.error = err?.message || String(err)
    report.db.stack = err?.stack?.split('\n').slice(0, 5).join(' | ')
  }

  return res.status(200).json(report)
}

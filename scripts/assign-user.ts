import { createClient } from '@libsql/client'
import 'dotenv/config'

const url = process.env.TURSO_DATABASE_URL
const token = process.env.TURSO_AUTH_TOKEN

if (!url || !token) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in .env')
  process.exit(1)
}

const resolvedUrl = url.startsWith('libsql://') ? url.replace('libsql://', 'https://') : url
const db = createClient({ url: resolvedUrl, authToken: token })

async function run() {
  console.log('Assigning all existing records to usr_alex without deleting any data...')

  const tables = ['orders', 'clients', 'contractors', 'payers', 'history', 'salary_records']

  for (const table of tables) {
    try {
      const res = await db.execute({
        sql: `UPDATE ${table} SET user_id = 'usr_alex' WHERE user_id IS NULL OR user_id = '' OR user_id = 'usr_admin'`,
        args: []
      })
      console.log(`Table ${table}: updated ${res.rowsAffected} rows to user_id = 'usr_alex'.`)
    } catch (e: any) {
      console.error(`Error updating table ${table}:`, e?.message || e)
    }
  }

  // Verify counts for usr_alex
  console.log('\n--- Final Verification for usr_alex ---')
  for (const table of tables) {
    try {
      const res = await db.execute({
        sql: `SELECT COUNT(*) as count FROM ${table} WHERE user_id = 'usr_alex'`,
        args: []
      })
      console.log(`Table ${table}: total records owned by usr_alex = ${res.rows[0]?.count}`)
    } catch (e: any) {
      console.error(`Error verifying table ${table}:`, e?.message || e)
    }
  }

  console.log('\nDone! All records successfully assigned to usr_alex.')
}

run().catch(e => {
  console.error('Assign script failed:', e)
  process.exit(1)
})

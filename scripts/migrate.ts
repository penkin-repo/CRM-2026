import { createClient } from '@libsql/client'
import 'dotenv/config'

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!
})

async function run(){
  console.log('Migrating Turso...')
  await db.execute(`CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    contact_person TEXT DEFAULT '',
    email TEXT DEFAULT '',
    note TEXT DEFAULT '',
    custom_fields TEXT DEFAULT '[]',
    created_at TEXT NOT NULL
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS contractors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    note TEXT DEFAULT '',
    created_at TEXT NOT NULL
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS payers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'cashless',
    created_at TEXT NOT NULL
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    client_id TEXT NOT NULL,
    product_name TEXT DEFAULT '',
    contractors TEXT DEFAULT '[]',
    sale_amount REAL DEFAULT 0,
    sale_formula TEXT DEFAULT '',
    payment_receiver_id TEXT DEFAULT '',
    payment_note TEXT DEFAULT '',
    payment_received INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    note TEXT DEFAULT '',
    created_at TEXT NOT NULL
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    snapshot TEXT NOT NULL
  )`)
  await db.execute(`CREATE TABLE IF NOT EXISTS salary_records (
    id TEXT PRIMARY KEY,
    month TEXT NOT NULL,
    salary_percent REAL DEFAULT 60,
    base_salary REAL DEFAULT 0,
    payer_adjustments TEXT DEFAULT '[]',
    total_adjustment REAL DEFAULT 0,
    final_salary REAL DEFAULT 0,
    paid_amount REAL DEFAULT 0,
    closed_at TEXT,
    note TEXT DEFAULT '',
    history TEXT DEFAULT '[]'
  )`)
  console.log('Done')
}

run().catch(e=>{ console.error(e); process.exit(1) })

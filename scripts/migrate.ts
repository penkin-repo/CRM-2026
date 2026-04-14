/**
 * Run once to create DB schema in Turso.
 * Usage: npx tsx scripts/migrate.ts
 */
import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const schema = `
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  contact_person TEXT DEFAULT '',
  email TEXT DEFAULT '',
  note TEXT DEFAULT '',
  custom_fields TEXT DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contractors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  client_id TEXT NOT NULL,
  product_name TEXT DEFAULT '',
  contractors TEXT DEFAULT '[]',
  sale_amount REAL DEFAULT 0,
  payment_receiver_id TEXT DEFAULT '',
  payment_note TEXT DEFAULT '',
  payment_received INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  snapshot TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS salary_records (
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
);
`;

async function main() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  console.log('Running migrations...');
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);

  for (const sql of statements) {
    await db.execute(sql);
    console.log('OK:', sql.slice(0, 60).replace(/\n/g, ' ') + '...');
  }
  console.log('✅ Migration complete!');
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});

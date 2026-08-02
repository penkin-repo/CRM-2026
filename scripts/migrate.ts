import { createClient } from '@libsql/client'
import 'dotenv/config'

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!
})

async function run(){
  console.log('Migrating Turso...')

  // 1. Table Users
  await db.execute(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TEXT NOT NULL
  )`)

  // 2. Table Clients
  await db.execute(`CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    contact_person TEXT DEFAULT '',
    email TEXT DEFAULT '',
    note TEXT DEFAULT '',
    custom_fields TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    user_id TEXT DEFAULT ''
  )`)

  // 3. Table Contractors
  await db.execute(`CREATE TABLE IF NOT EXISTS contractors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    note TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    user_id TEXT DEFAULT ''
  )`)

  // 4. Table Payers
  await db.execute(`CREATE TABLE IF NOT EXISTS payers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'cashless',
    created_at TEXT NOT NULL,
    user_id TEXT DEFAULT ''
  )`)

  // 5. Table Orders
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
    created_at TEXT NOT NULL,
    user_id TEXT DEFAULT ''
  )`)

  // Safe ALTER for user_id column if table already existed
  try { await db.execute('ALTER TABLE orders ADD COLUMN user_id TEXT DEFAULT ""') } catch {}
  try { await db.execute('ALTER TABLE clients ADD COLUMN user_id TEXT DEFAULT ""') } catch {}
  try { await db.execute('ALTER TABLE contractors ADD COLUMN user_id TEXT DEFAULT ""') } catch {}
  try { await db.execute('ALTER TABLE payers ADD COLUMN user_id TEXT DEFAULT ""') } catch {}

  // 6. Table History
  await db.execute(`CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    snapshot TEXT NOT NULL,
    user_id TEXT DEFAULT ''
  )`)

  // 7. Table Salary Records
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
    history TEXT DEFAULT '[]',
    user_id TEXT DEFAULT ''
  )`)

  console.log('Seeding initial data if empty...')

  // Seed Users
  const userCheck = await db.execute('SELECT COUNT(*) as count FROM users')
  if (Number(userCheck.rows[0].count) === 0) {
    console.log('Seeding default users...')
    await db.execute(`INSERT INTO users (id, username, password, name, role, created_at) VALUES
      ('usr_admin', 'admin', 'admin', 'Администратор', 'admin', '2026-01-01'),
      ('usr_alex', 'alex', 'alex123', 'Алексей (Менеджер)', 'user', '2026-01-02'),
      ('usr_manager', 'manager', 'manager123', 'Мария (Менеджер)', 'user', '2026-01-03')
    `)
  }

  // Seed Clients
  const clientCheck = await db.execute('SELECT COUNT(*) as count FROM clients')
  if (Number(clientCheck.rows[0].count) === 0) {
    console.log('Seeding clients...')
    await db.execute(`INSERT INTO clients (id, name, phone, contact_person, email, note, custom_fields, created_at, user_id) VALUES
      ('c1', 'ООО Альфа Медиа', '+7 495 123-45-67', 'Иванов И.', 'alpha@media.ru', 'VIP клиенты', '[]', '2026-02-01', 'usr_admin'),
      ('c2', 'Бета Трейд', '+7 495 234-56-78', 'Петрова А.', 'beta@trade.ru', 'Обычные заказы', '[]', '2026-02-05', 'usr_alex'),
      ('c3', 'Гамма Холдинг', '+7 495 345-67-89', 'Сидоров В.', 'gamma@holding.ru', 'Срочные монтажи', '[]', '2026-02-10', 'usr_admin')
    `)
  }

  // Seed Contractors
  const contractorCheck = await db.execute('SELECT COUNT(*) as count FROM contractors')
  if (Number(contractorCheck.rows[0].count) === 0) {
    console.log('Seeding contractors...')
    await db.execute(`INSERT INTO contractors (id, name, phone, note, created_at, user_id) VALUES
      ('co1', 'Менеджер Алексей', '+7 900 111-22-33', 'Сам делает монтаж и замеры', '2026-01-10', 'usr_alex'),
      ('co2', 'Монтаж Сервис', '+7 900 222-33-44', 'Внешняя бригада монтажников', '2026-01-12', 'usr_admin'),
      ('co3', 'Дизайн Бюро', '+7 900 333-44-55', 'Фриланс дизайнер', '2026-01-15', 'usr_admin')
    `)
  }

  // Seed Payers
  const payerCheck = await db.execute('SELECT COUNT(*) as count FROM payers')
  if (Number(payerCheck.rows[0].count) === 0) {
    console.log('Seeding payers...')
    await db.execute(`INSERT INTO payers (id, name, type, created_at, user_id) VALUES
      ('p1', 'ИП Иванов безнал', 'cashless', '2026-01-01', 'usr_admin'),
      ('p2', 'ООО Рога безнал', 'cashless', '2026-01-02', 'usr_admin'),
      ('p3', 'Наличные', 'cash', '2026-01-03', 'usr_admin'),
      ('p4', 'Карта менеджера', 'card', '2026-01-04', 'usr_alex')
    `)
  }

  // Seed Orders
  const orderCheck = await db.execute('SELECT COUNT(*) as count FROM orders')
  if (Number(orderCheck.rows[0].count) === 0) {
    console.log('Seeding orders...')
    const contractors1 = JSON.stringify([
      { id: 'cr1', contractorId: 'co1', description: 'Печать баннера 3х6', costFormula: '=6*1200', costValue: 7200, payerId: 'p1', paid: true, reconciled: true, note: '' }
    ])
    const contractors2 = JSON.stringify([
      { id: 'cr2', contractorId: 'co2', description: 'Монтаж световой вывески', costFormula: '=2*5000', costValue: 10000, payerId: 'p1', paid: false, reconciled: false, note: '' },
      { id: 'cr3', contractorId: 'co3', description: 'Разработка макета', costFormula: '=5000', costValue: 5000, payerId: 'p4', paid: true, reconciled: true, note: '' }
    ])
    await db.execute({
      sql: `INSERT INTO orders (id, date, client_id, product_name, contractors, sale_amount, sale_formula, payment_receiver_id, payment_note, payment_received, status, note, created_at, user_id) VALUES
        ('ord1', '2026-02-01', 'c1', 'Баннер 3x6 для акционного стенда', ?, 12000, '=12000', 'p1', 'Счет 104', 1, 'active', 'Срочно до пятницы', '2026-02-01', 'usr_admin'),
        ('ord2', '2026-02-02', 'c2', 'Вывеска световая на фасад', ?, 45000, '=45000', 'p1', 'Счет 108', 0, 'active', 'Согласовано с архитектором', '2026-02-02', 'usr_alex')
      `,
      args: [contractors1, contractors2]
    })
  }

  console.log('Done')
}

run().catch(e=>{ console.error(e); process.exit(1) })

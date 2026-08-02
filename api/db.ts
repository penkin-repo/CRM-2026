import { createClient } from '@libsql/client'

export function getDb(){
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN
  if(!url || !token) throw new Error('Missing TURSO env')
  return createClient({ url, authToken: token })
}

import { createClient } from '@libsql/client'

export function getDb(){
  let url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN
  if(!url || !token) throw new Error('Missing TURSO env')
  if (url.startsWith('libsql://')) {
    url = url.replace('libsql://', 'https://')
  }
  return createClient({ url, authToken: token })
}


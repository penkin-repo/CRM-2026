import type { User } from './types'

const cache = new Map<string,{ts:number,data:any}>()
const TTL = 3000

async function cachedGet<T>(url:string):Promise<T>{
  const now=Date.now()
  const c=cache.get(url)
  if(c && now - c.ts < TTL) return c.data as T
  const r=await fetch(url)
  if(!r.ok) throw new Error(`GET ${url} ${r.status}`)
  const data=await r.json()
  cache.set(url,{ts:now,data})
  return data
}

export function clearApiCache(){ cache.clear() }

export const api = {
  // auth
  verifyPassword: async (username:string, password:string): Promise<{ ok: boolean; user: User }> => {
    const r = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    if (!r.ok) {
      const errJson = await r.json().catch(() => ({}))
      throw new Error(errJson.error || 'Неверный логин или пароль')
    }
    return r.json()
  },

  // users management
  fetchUsers: () => cachedGet<User[]>('/api/users'),
  upsertUser: async (u: User) => {
    clearApiCache()
    return fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(u)
    }).then(r => r.json())
  },
  deleteUser: async (id: string) => {
    clearApiCache()
    return fetch(`/api/users?id=${id}`, { method: 'DELETE' }).then(r => r.json())
  },

  // clients
  fetchClients: (userId?: string) => cachedGet<any[]>(`/api/clients${userId ? `?userId=${userId}` : ''}`),
  upsertClient: async (c:any) => { clearApiCache(); return fetch('/api/clients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(c)}).then(r=>r.json()) },
  deleteClient: async (id:string) => { clearApiCache(); return fetch(`/api/clients?id=${id}`,{method:'DELETE'}).then(r=>r.json()) },

  // contractors
  fetchContractors: (userId?: string) => cachedGet<any[]>(`/api/contractors${userId ? `?userId=${userId}` : ''}`),
  upsertContractor: async (c:any) => { clearApiCache(); return fetch('/api/contractors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(c)}).then(r=>r.json()) },
  deleteContractor: async (id:string) => { clearApiCache(); return fetch(`/api/contractors?id=${id}`,{method:'DELETE'}).then(r=>r.json()) },

  // payers
  fetchPayers: (userId?: string) => cachedGet<any[]>(`/api/payers${userId ? `?userId=${userId}` : ''}`),
  upsertPayer: async (p:any) => { clearApiCache(); return fetch('/api/payers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)}).then(r=>r.json()) },
  deletePayer: async (id:string) => { clearApiCache(); return fetch(`/api/payers?id=${id}`,{method:'DELETE'}).then(r=>r.json()) },

  // orders
  fetchOrders: (userId?: string) => cachedGet<any[]>(`/api/orders${userId ? `?userId=${userId}` : ''}`),
  upsertOrder: async (o:any) => { clearApiCache(); return fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(o)}).then(r=>r.json()) },
  deleteOrder: async (id:string) => { clearApiCache(); return fetch(`/api/orders?id=${id}`,{method:'DELETE'}).then(r=>r.json()) },

  // history
  fetchHistory: () => cachedGet<any[]>('/api/history'),
  saveHistory: async (h:any) => { clearApiCache(); return fetch('/api/history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(h)}).then(r=>r.json()) },
  clearHistory: async () => { clearApiCache(); return fetch('/api/history',{method:'DELETE'}).then(r=>r.json()) },

  // salary
  fetchSalary: () => cachedGet<any[]>('/api/salary'),
  upsertSalary: async (s:any) => { clearApiCache(); return fetch('/api/salary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(s)}).then(r=>r.json()) },

  // ai assistant
  parseOrderWithAI: async (params: { text?: string; imageBase64?: string; apiKey?: string; clients: any[]; contractors: any[]; payers: any[] }) => {
    const r = await fetch('/api/ai-parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
    const json = await r.json()
    if (!r.ok || !json.ok) {
      throw new Error(json.error || 'Ошибка при разборе ИИ')
    }
    return json.data
  }
}


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
  verifyPassword: async (password:string)=>{
    const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})})
    if(!r.ok) throw new Error('auth failed')
    return r.json()
  },
  // clients
  fetchClients: ()=> cachedGet<any[]>('/api/clients'),
  upsertClient: async (c:any)=>{ clearApiCache(); return fetch('/api/clients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(c)}).then(r=>r.json()) },
  deleteClient: async (id:string)=>{ clearApiCache(); return fetch(`/api/clients?id=${id}`,{method:'DELETE'}).then(r=>r.json()) },

  fetchContractors: ()=> cachedGet<any[]>('/api/contractors'),
  upsertContractor: async (c:any)=>{ clearApiCache(); return fetch('/api/contractors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(c)}).then(r=>r.json()) },
  deleteContractor: async (id:string)=>{ clearApiCache(); return fetch(`/api/contractors?id=${id}`,{method:'DELETE'}).then(r=>r.json()) },

  fetchPayers: ()=> cachedGet<any[]>('/api/payers'),
  upsertPayer: async (p:any)=>{ clearApiCache(); return fetch('/api/payers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)}).then(r=>r.json()) },
  deletePayer: async (id:string)=>{ clearApiCache(); return fetch(`/api/payers?id=${id}`,{method:'DELETE'}).then(r=>r.json()) },

  fetchOrders: ()=> cachedGet<any[]>('/api/orders'),
  upsertOrder: async (o:any)=>{ clearApiCache(); return fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(o)}).then(r=>r.json()) },
  deleteOrder: async (id:string)=>{ clearApiCache(); return fetch(`/api/orders?id=${id}`,{method:'DELETE'}).then(r=>r.json()) },

  fetchHistory: ()=> cachedGet<any[]>('/api/history'),
  saveHistory: async (h:any)=>{ clearApiCache(); return fetch('/api/history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(h)}).then(r=>r.json()) },
  clearHistory: async ()=>{ clearApiCache(); return fetch('/api/history',{method:'DELETE'}).then(r=>r.json()) },

  fetchSalary: ()=> cachedGet<any[]>('/api/salary'),
  upsertSalary: async (s:any)=>{ clearApiCache(); return fetch('/api/salary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(s)}).then(r=>r.json()) },
}

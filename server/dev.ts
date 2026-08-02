import http from 'node:http'
import { URL } from 'node:url'
import dotenv from 'dotenv'
dotenv.config()

// Простой лоадер для api/*.ts через динамический import
const server = http.createServer(async (req, res)=>{
  const url = new URL(req.url||'', `http://${req.headers.host}`)
  if(!url.pathname.startsWith('/api/')){
    res.statusCode=404; res.end('Not API'); return
  }
  const name = url.pathname.replace('/api/','').split('?')[0].replace('.ts','')
  const file = `../api/${name}.ts`
  let body=''; req.on('data',c=>body+=c); req.on('end', async ()=>{
    try{
      const mod = await import(file + `?t=${Date.now()}`)
      const handler = mod.default
      const json = body ? JSON.parse(body) : undefined
      const vercelReq:any = { method: req.method, query: Object.fromEntries(url.searchParams), body: json, headers: req.headers }
      const vercelRes:any = {
        statusCode:200,
        _json:null,
        status(code:number){ this.statusCode=code; return this; },
        json(data:any){ this._json=data; res.setHeader('Content-Type','application/json'); res.statusCode=this.statusCode; res.end(JSON.stringify(data)); },
        end(d?:any){ res.end(d); }
      }
      await handler(vercelReq, vercelRes)
    }catch(e:any){
      console.error(e)
      res.statusCode=500; res.end(JSON.stringify({error:e.message}))
    }
  })
})

server.listen(3000, ()=> console.log('API dev server http://localhost:3000'))

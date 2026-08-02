import { spawn } from 'node:child_process'

const vite = spawn('pnpm', ['dev:vite'], { stdio:'inherit', shell:true })
const api = spawn('pnpm', ['dev:api'], { stdio:'inherit', shell:true })

process.on('SIGINT', ()=>{ vite.kill(); api.kill(); process.exit() })

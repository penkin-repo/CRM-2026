import crypto from 'node:crypto'
import type { VercelRequest } from '@vercel/node'

const SECRET = process.env.AUTH_SECRET || process.env.TURSO_AUTH_TOKEN || 'a29-crm-secure-session-key-2026'

export interface SessionUser {
  id: string
  username: string
  name: string
  role: string
}

export function generateToken(user: SessionUser): string {
  const payload = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days valid
  }
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto.createHmac('sha256', SECRET).update(payloadStr).digest('base64url')
  return `${payloadStr}.${signature}`
}

export function verifyToken(token: string): { valid: boolean; user?: SessionUser } {
  if (!token || typeof token !== 'string') return { valid: false }
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return { valid: false }
    const [payloadStr, signature] = parts
    const expectedSignature = crypto.createHmac('sha256', SECRET).update(payloadStr).digest('base64url')
    if (signature !== expectedSignature) return { valid: false }

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'))
    if (payload.exp && payload.exp < Date.now()) return { valid: false }

    return {
      valid: true,
      user: {
        id: payload.id,
        username: payload.username,
        name: payload.name,
        role: payload.role
      }
    }
  } catch {
    return { valid: false }
  }
}

export function verifyAuth(req: VercelRequest): { valid: boolean; user?: SessionUser } {
  // Allow health checks or internal options
  if (req.method === 'OPTIONS') return { valid: true }

  const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string) || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim()

  return verifyToken(token)
}

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.body as { password: string };
  const correct = process.env.APP_PASSWORD;

  if (!correct) return res.status(500).json({ error: 'APP_PASSWORD not configured' });
  if (password !== correct) return res.status(401).json({ error: 'Неверный пароль' });

  res.status(200).json({ ok: true });
}

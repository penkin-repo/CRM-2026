import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { api } from '../api'
import type { User } from '../types'

interface LoginScreenProps {
  onLogin: (user: User) => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Заполните логин и пароль')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.verifyPassword(username.trim(), password)
      if (res && res.user) {
        onLogin(res.user)
      } else {
        setError('Ошибка авторизации')
      }
    } catch (e: any) {
      setError(e.message || 'Неверный логин или пароль')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (u: string, p: string) => {
    setUsername(u)
    setPassword(p)
  }

  return (
    <div className="fixed inset-0 bg-[#e5e8ed] flex items-center justify-center z-50 font-sans">
      <div className="bg-white rounded-xl shadow-2xl border border-[#b8bdc5] p-7 w-[380px]">
        {/* Header Banner */}
        <div className="flex items-center gap-3 mb-6 bg-gradient-to-r from-[#ffcc00] via-[#ffd426] to-[#ffcc00] p-3 rounded-lg border border-[#d4a700]">
          <div className="w-10 h-10 bg-red-600 text-white rounded flex items-center justify-center font-black text-lg shadow-xs border border-red-800 select-none">
            A29
          </div>
          <div>
            <div className="font-extrabold text-sm text-[#1c1d1f]">A29 CRM 8.3</div>
            <div className="text-[11px] text-slate-700 font-semibold">Управление CRM • Авторизация</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#333740] mb-1">Имя пользователя (Логин):</label>
            <input
              className="w-full border border-[#b8bdc5] rounded px-3 py-2 text-xs outline-none focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00] text-[#1c1d1f] font-medium bg-[#fffdf0]"
              type="text"
              placeholder="Введите логин"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#333740] mb-1">Пароль:</label>
            <input
              className="w-full border border-[#b8bdc5] rounded px-3 py-2 text-xs outline-none focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00] text-[#1c1d1f] font-medium bg-[#fffdf0]"
              type="password"
              placeholder="Введите пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {error && (
            <div className="text-red-700 bg-red-50 border border-red-200 rounded p-2 text-xs font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" /> {error}
            </div>
          )}

          <button
            className="w-full bg-gradient-to-b from-[#ffdb4d] to-[#ffcc00] hover:from-[#ffcc00] hover:to-[#e6b800] text-[#1c1d1f] border border-[#d9a800] font-bold rounded py-2 text-xs transition cursor-pointer shadow-xs active:scale-98 disabled:opacity-50"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Авторизация...' : 'Войти в сеанс'}
          </button>
        </div>

        {/* Demo Accounts Presets */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="text-[11px] font-bold text-[#555a64] mb-2">Демо-пользователи в базе данных:</div>
          <div className="space-y-1">
            <button
              onClick={() => fillDemo('admin', 'admin')}
              className="w-full text-left text-xs bg-slate-50 hover:bg-[#fff9d6] border border-slate-200 rounded px-2.5 py-1 flex justify-between items-center cursor-pointer transition"
            >
              <span className="font-bold text-[#1c1d1f]">admin</span>
              <span className="text-[10px] text-slate-500 font-mono">пароль: admin (Администратор)</span>
            </button>
            <button
              onClick={() => fillDemo('alex', 'alex123')}
              className="w-full text-left text-xs bg-slate-50 hover:bg-[#fff9d6] border border-slate-200 rounded px-2.5 py-1 flex justify-between items-center cursor-pointer transition"
            >
              <span className="font-bold text-[#1c1d1f]">alex</span>
              <span className="text-[10px] text-slate-500 font-mono">пароль: alex123 (Алексей)</span>
            </button>
            <button
              onClick={() => fillDemo('manager', 'manager123')}
              className="w-full text-left text-xs bg-slate-50 hover:bg-[#fff9d6] border border-slate-200 rounded px-2.5 py-1 flex justify-between items-center cursor-pointer transition"
            >
              <span className="font-bold text-[#1c1d1f]">manager</span>
              <span className="text-[10px] text-slate-500 font-mono">пароль: manager123 (Мария)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

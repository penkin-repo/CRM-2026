import { useEffect, useState } from 'react'
import LoginScreen from './components/LoginScreen'
import DashboardPage from './pages/DashboardPage'
import type { User } from './types'
import './index.css'

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const raw = sessionStorage.getItem('crm_user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')

  useEffect(() => {
    document.documentElement.className = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  const handleLogin = (user: User) => {
    setCurrentUser(user)
    try {
      sessionStorage.setItem('crm_user', JSON.stringify(user))
    } catch {}
  }

  const handleLogout = () => {
    setCurrentUser(null)
    try {
      sessionStorage.removeItem('crm_user')
    } catch {}
  }

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />

  return (
    <div className="h-screen flex flex-col bg-[#e5e8ed] font-sans text-[#22252a]">
      {/* 1C Enterprise Header Bar */}
      <header className="h-12 bg-gradient-to-r from-[#ffcc00] via-[#ffd426] to-[#ffcc00] border-b border-[#d4a700] flex items-center px-4 gap-3 shadow-xs select-none">
        <div className="w-8 h-8 bg-red-600 text-white rounded-md flex items-center justify-center font-black text-sm shadow-xs border border-red-700">
          1С
        </div>
        <div className="flex flex-col">
          <div className="font-extrabold text-sm text-[#1c1d1f] tracking-tight">
            1С:CRM Таблица — Управление рекламным агентством
          </div>
          <div className="text-[10px] text-slate-700 font-medium">
            Редакция 3.0 • Предприятие (Multi-User)
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="text-xs font-semibold text-slate-800 bg-[#fff5a8] px-2.5 py-0.5 rounded border border-[#e5ba00] flex items-center gap-1.5">
            <span>👤 Пользователь: <b>{currentUser.name}</b></span>
            <span className="text-[10px] bg-slate-800 text-white px-1.5 py-0.2 rounded uppercase font-bold">{currentUser.role}</span>
          </div>

          <button
            className="bg-white/80 hover:bg-white text-slate-800 border border-[#d4a700] rounded px-2.5 py-1 text-xs font-semibold cursor-pointer shadow-2xs transition"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? '☀ Светлая' : '🌙 Темная'}
          </button>
          
          <button
            className="bg-red-700 hover:bg-red-800 text-white rounded px-2.5 py-1 text-xs font-semibold cursor-pointer shadow-2xs transition border border-red-800"
            onClick={handleLogout}
          >
            Завершить сеанс
          </button>
        </div>
      </header>

      <DashboardPage currentUser={currentUser} />
    </div>
  )
}

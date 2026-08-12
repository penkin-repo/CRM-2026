import { useEffect, useState } from 'react'
import { User as UserIcon, Sun, Moon, LogOut } from 'lucide-react'
import LoginScreen from './components/LoginScreen'
import DashboardPage from './pages/DashboardPage'
import type { User } from './types'
import { APP_VERSION, APP_BUILD } from './version'
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
    <div className="h-screen flex flex-col bg-[#e5e8ed] font-sans text-[#22252a] relative">
      {/* Enterprise Header Bar */}
      <header className="h-12 bg-gradient-to-r from-[#ffcc00] via-[#ffd426] to-[#ffcc00] border-b border-[#d4a700] flex items-center px-4 gap-3 shadow-xs select-none">
        <div className="w-8 h-8 bg-red-600 text-white rounded-md flex items-center justify-center font-black text-sm shadow-xs border border-red-700">
          A29
        </div>
        <div className="hidden sm:block font-extrabold text-sm text-[#1c1d1f] tracking-tight">
          A29 CRM
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="text-xs font-semibold text-slate-800 bg-[#fff5a8] px-2.5 py-0.5 rounded border border-[#e5ba00] flex items-center gap-1.5">
            <span className="flex items-center gap-1"><UserIcon className="w-3.5 h-3.5 text-slate-700" /> Пользователь: <b>{currentUser.name}</b></span>
            <span className="text-[10px] bg-slate-800 text-white px-1.5 py-0.2 rounded uppercase font-bold">{currentUser.role}</span>
          </div>

          <button
            className="bg-white/80 hover:bg-white text-slate-800 border border-[#d4a700] rounded px-2.5 py-1 text-xs font-semibold cursor-pointer shadow-2xs transition flex items-center gap-1"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <><Sun className="w-3.5 h-3.5" /> Светлая</> : <><Moon className="w-3.5 h-3.5" /> Темная</>}
          </button>

          <button
            className="bg-red-700 hover:bg-red-800 text-white rounded px-2.5 py-1 text-xs font-semibold cursor-pointer shadow-2xs transition border border-red-800 flex items-center gap-1"
            onClick={handleLogout}
          >
            <LogOut className="w-3.5 h-3.5" /> Завершить сеанс
          </button>
        </div>
      </header>

      <DashboardPage currentUser={currentUser} />

      {/* Permanent Fixed Bottom-Right Version Indicator */}
      <div className="fixed bottom-2 right-3 pointer-events-none z-50 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 select-none">
        A29 CRM {APP_VERSION} ({APP_BUILD})
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { User as UserIcon, Sun, Moon, LogOut, Menu, X } from 'lucide-react'
import LoginScreen from './components/LoginScreen'
import DashboardPage from './pages/DashboardPage'
import { api, clearAuthToken } from './api'
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
    clearAuthToken()
    setCurrentUser(null)
    try {
      sessionStorage.removeItem('crm_user')
    } catch {}
  }

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />

  return (
    <div className="h-screen flex flex-col bg-[#e5e8ed] font-sans text-[#22252a] relative">
      {/* Enterprise Header Bar */}
      <header className="h-12 bg-gradient-to-r from-[#ffcc00] via-[#ffd426] to-[#ffcc00] border-b border-[#d4a700] flex items-center px-4 gap-3 shadow-xs select-none relative z-30">
        <div className="w-8 h-8 bg-red-600 text-white rounded-md flex items-center justify-center font-black text-sm shadow-xs border border-red-700">
          A29
        </div>
        <div className="hidden sm:block font-extrabold text-sm text-[#1c1d1f] tracking-tight">
          A29 CRM
        </div>

        {/* Desktop Controls */}
        <div className="ml-auto hidden sm:flex items-center gap-2">
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

        {/* Mobile Burger Menu Button */}
        <div className="ml-auto sm:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="bg-white/80 hover:bg-white text-slate-800 border border-[#d4a700] p-1.5 rounded shadow-xs cursor-pointer flex items-center justify-center"
            title="Меню"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Burger Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden bg-[#fff5a8] border-b border-[#d4a700] p-3 flex flex-col gap-2.5 shadow-md z-40 select-none">
          <div className="text-xs font-semibold text-slate-800 flex items-center justify-between bg-white/70 p-2 rounded border border-[#e5ba00]">
            <span className="flex items-center gap-1.5"><UserIcon className="w-4 h-4 text-slate-700" /> Пользователь: <b>{currentUser.name}</b></span>
            <span className="text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded uppercase font-bold">{currentUser.role}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="flex-1 bg-white hover:bg-slate-50 text-slate-800 border border-[#d4a700] rounded py-1.5 text-xs font-semibold cursor-pointer shadow-2xs transition flex items-center justify-center gap-1.5"
              onClick={() => {
                setTheme(theme === 'dark' ? 'light' : 'dark')
              }}
            >
              {theme === 'dark' ? <><Sun className="w-4 h-4 text-amber-500" /> Светлая тема</> : <><Moon className="w-4 h-4 text-slate-700" /> Темная тема</>}
            </button>

            <button
              className="flex-1 bg-red-700 hover:bg-red-800 text-white rounded py-1.5 text-xs font-semibold cursor-pointer shadow-2xs transition border border-red-800 flex items-center justify-center gap-1.5"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" /> Завершить сеанс
            </button>
          </div>
        </div>
      )}

      <DashboardPage currentUser={currentUser} />

      {/* Permanent Fixed Bottom-Right Version Indicator */}
      <div className="fixed bottom-2 right-3 pointer-events-none z-50 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 select-none">
        A29 CRM {APP_VERSION} ({APP_BUILD})
      </div>
    </div>
  )
}

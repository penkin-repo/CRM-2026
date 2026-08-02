import { useEffect, useState } from 'react'
import LoginScreen from './components/LoginScreen'
import DashboardPage from './pages/DashboardPage'
import './index.css'

export default function App(){
  const [authed,setAuthed]=useState(()=>{ try{ return sessionStorage.getItem('crm_auth')==='1' }catch{ return false } })
  const [theme,setTheme]=useState(()=> localStorage.getItem('theme') || 'light')
  useEffect(()=>{ document.documentElement.className=theme; localStorage.setItem('theme',theme) },[theme])

  if(!authed) return <LoginScreen onLogin={()=>setAuthed(true)} />

  return (
    <div className="h-screen flex flex-col bg-[#e8edf3]">
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shadow-sm">
        <div className="w-9 h-9 bg-black text-white rounded-lg flex items-center justify-center font-bold">S</div>
        <div className="font-bold">CRM Таблица • compact sheet (React + Turso)</div>
        <div className="ml-auto flex gap-2">
          <button className="border rounded-lg px-3 py-1 text-xs" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?'☀':'🌙'}</button>
          <button className="border rounded-lg px-3 py-1 text-xs" onClick={()=>{ try{ sessionStorage.removeItem('crm_auth') }catch{}; setAuthed(false) }}>Выйти</button>
        </div>
      </header>
      <DashboardPage />
    </div>
  )
}

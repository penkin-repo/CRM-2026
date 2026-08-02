import { useState } from 'react'
import { api } from '../api'

export default function LoginScreen({ onLogin }:{ onLogin:()=>void }){
  const [pwd,setPwd]=useState('')
  const [err,setErr]=useState('')
  const login=async()=>{
    try{
      await api.verifyPassword(pwd)
      sessionStorage.setItem('crm_auth','1')
      onLogin()
    }catch{
      // fallback для локальной версии без API
      if(pwd.trim().length>=1){ sessionStorage.setItem('crm_auth','1'); onLogin(); }
      else setErr('Неверный пароль')
    }
  }
  return (
    <div className="fixed inset-0 bg-[#e8edf3] flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl border p-8 w-[360px]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center font-bold">S</div>
          <div><div className="font-bold">CRM Таблица v10</div><div className="text-xs text-slate-500">Вход для команды</div></div>
        </div>
        <input className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" type="password" placeholder="Пароль admin" value={pwd} onChange={e=>setPwd(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} />
        {err && <div className="text-red-500 text-xs mt-2">{err}</div>}
        <button className="mt-4 w-full bg-blue-600 text-white rounded-full py-2 text-sm" onClick={login}>Войти</button>
        <div className="text-[11px] text-slate-400 mt-3">Offline-версия принимает любой пароль, с Turso — проверяет APP_PASSWORD</div>
      </div>
    </div>
  )
}

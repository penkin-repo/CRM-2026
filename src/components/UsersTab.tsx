import { useState, useEffect } from 'react'
import { UserPlus, Trash2 } from 'lucide-react'
import type { User } from '../types'
import { api } from '../api'

interface UsersTabProps {
  currentUser: User
}

export default function UsersTab({ currentUser }: UsersTabProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await api.fetchUsers()
      if (Array.isArray(data)) setUsers(data)
    } catch (e) {
      console.error('Error fetching users:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleAddUser = () => {
    const newUser: User = {
      id: 'usr_' + Math.random().toString(36).slice(2, 7),
      username: 'user_' + Math.random().toString(36).slice(2, 6),
      password: '123',
      name: 'Новый пользователь',
      role: 'user',
      createdAt: new Date().toISOString()
    }
    setUsers(prev => [...prev, newUser])
    api.upsertUser(newUser).then(loadUsers).catch(() => {})
  }

  const handleUpdateUser = (u: User) => {
    setUsers(prev => prev.map(item => item.id === u.id ? u : item))
    api.upsertUser(u).catch(() => {})
  }

  const handleDeleteUser = (id: string) => {
    if (id === currentUser.id) {
      alert('Нельзя удалить текущего авторизованного пользователя!')
      return
    }
    setUsers(prev => prev.filter(u => u.id !== id))
    api.deleteUser(id).catch(() => {})
  }

  return (
    <div className="flex-1 flex flex-col p-3 overflow-auto">
      <div className="flex justify-between items-center mb-2 bg-[#f0f2f5] p-2 border border-[#b8bdc5] rounded shadow-2xs">
        <div>
          <h2 className="text-xs font-bold text-[#1c1d1f] uppercase tracking-wide">
            Справочник: Пользователи и Права доступа ({users.length})
          </h2>
          <p className="text-[11px] text-[#555a64]">
            Управление учётными записями, логинами и паролями для входа в систему
          </p>
        </div>
        <button
          className="bg-gradient-to-b from-[#ffdb4d] to-[#ffcc00] hover:from-[#ffcc00] text-[#1c1d1f] border border-[#d9a800] rounded px-3 py-1 text-xs font-bold cursor-pointer transition shadow-2xs flex items-center gap-1"
          onClick={handleAddUser}
        >
          <UserPlus className="w-3.5 h-3.5" /> Создать пользователя
        </button>
      </div>

      <div className="bg-white border border-[#b8bdc5] shadow-2xs overflow-hidden">
        <table className="sheet-grid w-full">
          <thead>
            <tr>
              <th className="sheet-header" style={{ width: 40 }}>№</th>
              <th className="sheet-header" style={{ width: 160 }}>Логин для входа</th>
              <th className="sheet-header" style={{ width: 160 }}>Пароль</th>
              <th className="sheet-header" style={{ width: 220 }}>ФИО / Имя пользователя</th>
              <th className="sheet-header" style={{ width: 140 }}>Роль / Права</th>
              <th className="sheet-header" style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-400 text-xs">
                  {loading ? 'Загрузка списка пользователей...' : 'Список пользователей пуст'}
                </td>
              </tr>
            ) : (
              users.map((u, idx) => (
                <tr key={u.id} className="hover:bg-[#fff9d6] text-xs border-b border-[#c9ced6]">
                  <td className="sheet-cell text-center text-slate-500 font-bold bg-[#f4f6f8]">{idx + 1}</td>
                  <td className="sheet-cell p-0">
                    <input
                      type="text"
                      value={u.username}
                      onChange={e => handleUpdateUser({ ...u, username: e.target.value })}
                      className="w-full h-full px-2 text-xs font-bold outline-none bg-transparent font-mono"
                    />
                  </td>
                  <td className="sheet-cell p-0">
                    <input
                      type="text"
                      value={u.password || ''}
                      onChange={e => handleUpdateUser({ ...u, password: e.target.value })}
                      className="w-full h-full px-2 text-xs outline-none bg-transparent font-mono text-[#b91c1c]"
                    />
                  </td>
                  <td className="sheet-cell p-0">
                    <input
                      type="text"
                      value={u.name}
                      onChange={e => handleUpdateUser({ ...u, name: e.target.value })}
                      className="w-full h-full px-2 text-xs font-semibold outline-none bg-transparent"
                    />
                  </td>
                  <td className="sheet-cell p-0">
                    <select
                      value={u.role}
                      onChange={e => handleUpdateUser({ ...u, role: e.target.value as any })}
                      className="w-full h-full text-xs px-2 outline-none bg-transparent cursor-pointer font-bold"
                    >
                      <option value="admin">Администратор</option>
                      <option value="user">Пользователь</option>
                    </select>
                  </td>
                  <td className="sheet-cell text-center">
                    <button
                      className="text-red-600 hover:text-red-800 text-xs font-bold cursor-pointer"
                      onClick={() => handleDeleteUser(u.id)}
                      title="Удалить пользователя"
                    >
                      <Trash2 className="w-3.5 h-3.5 inline" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

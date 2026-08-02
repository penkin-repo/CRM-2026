import { ChangeEvent } from 'react'

export type ActiveTab = 'orders' | 'clients' | 'contractors' | 'payers' | 'reports' | 'history' | 'users'

interface NavigationTabsProps {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  ordersCount: number
  clientsCount: number
  contractorsCount: number
  payersCount: number
  historyCount: number
  isAdmin?: boolean
  onExportJSON: () => void
  onImportJSON: (e: ChangeEvent<HTMLInputElement>) => void
}

export default function NavigationTabs({
  activeTab,
  setActiveTab,
  ordersCount,
  clientsCount,
  contractorsCount,
  payersCount,
  historyCount,
  isAdmin,
  onExportJSON,
  onImportJSON
}: NavigationTabsProps) {
  return (
    <div className="bg-[#f0f2f5] border-b border-[#b8bdc5] px-3 py-1.5 flex items-center gap-2 shadow-2xs select-none">
      <div className="flex gap-1 bg-[#d9dce1] p-0.5 rounded border border-[#b8bdc5]">
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border ${activeTab === 'orders' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
          onClick={() => setActiveTab('orders')}
        >
          📋 Заказы ({ordersCount})
        </button>
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border ${activeTab === 'clients' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
          onClick={() => setActiveTab('clients')}
        >
          👥 Клиенты ({clientsCount})
        </button>
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border ${activeTab === 'contractors' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
          onClick={() => setActiveTab('contractors')}
        >
          🏗️ Подрядчики ({contractorsCount})
        </button>
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border ${activeTab === 'payers' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
          onClick={() => setActiveTab('payers')}
        >
          💰 Плательщики ({payersCount})
        </button>
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border ${activeTab === 'reports' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
          onClick={() => setActiveTab('reports')}
        >
          📊 Отчеты 1С
        </button>
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border ${activeTab === 'history' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
          onClick={() => setActiveTab('history')}
        >
          📜 Журнал ({historyCount})
        </button>
        {isAdmin && (
          <button
            className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border ${activeTab === 'users' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
            onClick={() => setActiveTab('users')}
          >
            🔑 Пользователи
          </button>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          className="text-xs border border-[#b8bdc5] rounded px-2.5 py-0.5 bg-white hover:bg-slate-100 font-medium cursor-pointer shadow-2xs text-[#22252a]"
          onClick={onExportJSON}
          title="Выгрузить данные в формате 1С JSON"
        >
          📥 Выгрузка
        </button>
        <label className="text-xs border border-[#b8bdc5] rounded px-2.5 py-0.5 bg-white hover:bg-slate-100 font-medium cursor-pointer shadow-2xs text-[#22252a]">
          📤 Загрузка
          <input type="file" accept=".json" onChange={onImportJSON} className="hidden" />
        </label>
      </div>
    </div>
  )
}

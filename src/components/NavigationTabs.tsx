import { ChangeEvent } from 'react'
import {
  ClipboardList,
  Users,
  Building2,
  CreditCard,
  BarChart3,
  History,
  ShieldCheck,
  Download,
  Upload
} from 'lucide-react'

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
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border flex items-center gap-1.5 ${activeTab === 'orders' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
          onClick={() => setActiveTab('orders')}
        >
          <ClipboardList className="w-3.5 h-3.5" /> Заказы ({ordersCount})
        </button>
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border flex items-center gap-1.5 ${activeTab === 'clients' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
          onClick={() => setActiveTab('clients')}
        >
          <Users className="w-3.5 h-3.5" /> Клиенты ({clientsCount})
        </button>
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border flex items-center gap-1.5 ${activeTab === 'contractors' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
          onClick={() => setActiveTab('contractors')}
        >
          <Building2 className="w-3.5 h-3.5" /> Подрядчики ({contractorsCount})
        </button>
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border flex items-center gap-1.5 ${activeTab === 'payers' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
          onClick={() => setActiveTab('payers')}
        >
          <CreditCard className="w-3.5 h-3.5" /> Плательщики ({payersCount})
        </button>
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border flex items-center gap-1.5 ${activeTab === 'reports' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
          onClick={() => setActiveTab('reports')}
        >
          <BarChart3 className="w-3.5 h-3.5" /> Отчеты
        </button>
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border flex items-center gap-1.5 ${activeTab === 'history' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
          onClick={() => setActiveTab('history')}
        >
          <History className="w-3.5 h-3.5" /> Журнал ({historyCount})
        </button>
        {isAdmin && (
          <button
            className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border flex items-center gap-1.5 ${activeTab === 'users' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
            onClick={() => setActiveTab('users')}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Пользователи
          </button>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          className="text-xs border border-[#b8bdc5] rounded px-2.5 py-1 bg-white hover:bg-slate-100 font-medium cursor-pointer shadow-2xs text-[#22252a] flex items-center gap-1"
          onClick={onExportJSON}
          title="Выгрузить данные A29 CRM (JSON)"
        >
          <Download className="w-3.5 h-3.5 text-slate-600" /> Выгрузка
        </button>
        <label className="text-xs border border-[#b8bdc5] rounded px-2.5 py-1 bg-white hover:bg-slate-100 font-medium cursor-pointer shadow-2xs text-[#22252a] flex items-center gap-1">
          <Upload className="w-3.5 h-3.5 text-slate-600" /> Загрузка
          <input type="file" accept=".json" onChange={onImportJSON} className="hidden" />
        </label>
      </div>
    </div>
  )
}

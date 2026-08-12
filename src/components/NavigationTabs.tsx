import { useState, useRef, useEffect, ChangeEvent } from 'react'
import {
  ClipboardList,
  Users,
  Building2,
  CreditCard,
  BarChart3,
  History,
  ShieldCheck,
  Download,
  Upload,
  ChevronDown
} from 'lucide-react'

export type ActiveTab = 'orders' | 'clients' | 'contractors' | 'payers' | 'reports' | 'history' | 'users'
export type ExportType = 'all' | 'clients' | 'contractors' | 'orders'

interface NavigationTabsProps {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  ordersCount: number
  clientsCount: number
  contractorsCount: number
  payersCount: number
  historyCount: number
  isAdmin?: boolean
  onExportJSON: (type: ExportType) => void
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
  const [isExportOpen, setIsExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setIsExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="bg-[#f0f2f5] border-b border-[#b8bdc5] px-3 py-1.5 flex items-center gap-2 shadow-2xs select-none overflow-x-auto max-w-full">
      <div className="flex gap-1 bg-[#d9dce1] p-0.5 rounded border border-[#b8bdc5] shrink-0 whitespace-nowrap">
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border flex items-center gap-1.5 shrink-0 whitespace-nowrap ${activeTab === 'orders' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
          onClick={() => setActiveTab('orders')}
        >
          <ClipboardList className="w-3.5 h-3.5" /> Заказы ({ordersCount})
        </button>
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border flex items-center gap-1.5 shrink-0 whitespace-nowrap ${activeTab === 'clients' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
          onClick={() => setActiveTab('clients')}
        >
          <Users className="w-3.5 h-3.5" /> Клиенты ({clientsCount})
        </button>
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border flex items-center gap-1.5 shrink-0 whitespace-nowrap ${activeTab === 'contractors' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
          onClick={() => setActiveTab('contractors')}
        >
          <Building2 className="w-3.5 h-3.5" /> Подрядчики ({contractorsCount})
        </button>
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border flex items-center gap-1.5 shrink-0 whitespace-nowrap ${activeTab === 'payers' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
          onClick={() => setActiveTab('payers')}
        >
          <CreditCard className="w-3.5 h-3.5" /> Плательщики ({payersCount})
        </button>
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border flex items-center gap-1.5 shrink-0 whitespace-nowrap ${activeTab === 'reports' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
          onClick={() => setActiveTab('reports')}
        >
          <BarChart3 className="w-3.5 h-3.5" /> Отчеты
        </button>
        <button
          className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border flex items-center gap-1.5 shrink-0 whitespace-nowrap ${activeTab === 'history' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
          onClick={() => setActiveTab('history')}
        >
          <History className="w-3.5 h-3.5" /> Журнал ({historyCount})
        </button>
        {isAdmin && (
          <button
            className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition border flex items-center gap-1.5 shrink-0 whitespace-nowrap ${activeTab === 'users' ? 'bg-[#ffcc00] border-[#d9a800] text-[#1c1d1f] shadow-xs' : 'bg-[#e6e9ed] border-transparent text-[#44474e] hover:bg-white'}`}
            onClick={() => setActiveTab('users')}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Пользователи
          </button>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2 shrink-0 whitespace-nowrap">
        {/* Export Dropdown */}
        <div className="relative" ref={exportRef}>
          <button
            className="text-xs border border-[#b8bdc5] rounded px-2.5 py-1 bg-white hover:bg-slate-100 font-medium cursor-pointer shadow-2xs text-[#22252a] flex items-center gap-1 shrink-0 whitespace-nowrap"
            onClick={() => setIsExportOpen(prev => !prev)}
            title="Выбор режима выгрузки JSON"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" /> Выгрузка <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {isExportOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-[#b8bdc5] rounded shadow-lg z-50 py-1 w-52 text-xs">
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-[#fff9d6] font-bold text-slate-800 flex items-center gap-2 cursor-pointer border-b border-slate-100"
                onClick={() => {
                  onExportJSON('all')
                  setIsExportOpen(false)
                }}
              >
                🌐 Вся база целиком (JSON)
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-[#fff9d6] font-medium text-slate-700 flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  onExportJSON('clients')
                  setIsExportOpen(false)
                }}
              >
                👥 Только Клиенты (JSON)
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-[#fff9d6] font-medium text-slate-700 flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  onExportJSON('contractors')
                  setIsExportOpen(false)
                }}
              >
                🏗️ Только Подрядчики (JSON)
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-[#fff9d6] font-medium text-slate-700 flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  onExportJSON('orders')
                  setIsExportOpen(false)
                }}
              >
                📋 Только Заказы (JSON)
              </button>
            </div>
          )}
        </div>

        {/* Import Button */}
        <label className="text-xs border border-[#b8bdc5] rounded px-2.5 py-1 bg-white hover:bg-slate-100 font-medium cursor-pointer shadow-2xs text-[#22252a] flex items-center gap-1 shrink-0 whitespace-nowrap">
          <Upload className="w-3.5 h-3.5 text-slate-600" /> Загрузка
          <input type="file" accept=".json" onChange={onImportJSON} className="hidden" />
        </label>
      </div>
    </div>
  )
}

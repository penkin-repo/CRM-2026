import { useState, useEffect, ChangeEvent } from 'react'
import { api } from '../api'
import type { Client, Contractor, Payer, Order, HistoryEntry, User } from '../types'

// Modular tab components
import NavigationTabs, { ActiveTab } from '../components/NavigationTabs'
import OrdersTab from '../components/OrdersTab'
import ClientsTab from '../components/ClientsTab'
import ContractorsTab from '../components/ContractorsTab'
import PayersTab from '../components/PayersTab'
import ReportsTab from '../components/ReportsTab'
import HistoryTab from '../components/HistoryTab'
import UsersTab from '../components/UsersTab'

interface DashboardPageProps {
  currentUser: User
}

export default function DashboardPage({ currentUser }: DashboardPageProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('orders')

  // Core entities state
  const [orders, setOrders] = useState<Order[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [payers, setPayers] = useState<Payer[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])

  // Filter States with localStorage persistence
  const getSavedFilters = () => {
    try {
      const saved = localStorage.getItem('crm_a29_filters') || localStorage.getItem('crm_1c_filters')
      if (saved) return JSON.parse(saved)
    } catch {}
    return {}
  }

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>(() => {
    return getSavedFilters().statusFilter || 'all'
  })

  const [searchQuery, setSearchQuery] = useState(() => {
    return getSavedFilters().searchQuery || ''
  })

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // Always default to current month — never let a stale saved month hide current data
    return new Date().toISOString().slice(0, 7)
  })


  const [dateFrom, setDateFrom] = useState<string>(() => {
    return getSavedFilters().dateFrom || ''
  })

  const [dateTo, setDateTo] = useState<string>(() => {
    return getSavedFilters().dateTo || ''
  })

  // Save filters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('crm_a29_filters', JSON.stringify({
        statusFilter,
        searchQuery,
        selectedMonth,
        dateFrom,
        dateTo
      }))
    } catch {}
  }, [statusFilter, searchQuery, selectedMonth, dateFrom, dateTo])

  // Admin view switcher state (all / specific user)
  const [viewUserId, setViewUserId] = useState<string>(() => {
    return currentUser.role === 'admin' ? 'all' : currentUser.id
  })
  const [allUsersList, setAllUsersList] = useState<User[]>([])

  // Initial Data Load — always trust Turso API
  const loadAllData = async () => {
    try {
      localStorage.removeItem('crm_v10_reports_fixed')
      localStorage.removeItem('crm_1c_backup')
    } catch {}

    try {
      const targetId = currentUser.role === 'admin' ? viewUserId : currentUser.id
      const [ordData, clData, coData, pyData, histData, usersData] = await Promise.all([
        api.fetchOrders(targetId).catch(() => []),
        api.fetchClients(targetId).catch(() => []),
        api.fetchContractors(targetId).catch(() => []),
        api.fetchPayers(targetId).catch(() => []),
        api.fetchHistory().catch(() => []),
        currentUser.role === 'admin' ? api.fetchUsers().catch(() => []) : Promise.resolve([])
      ])

      setOrders(Array.isArray(ordData) ? ordData : [])
      setClients(Array.isArray(clData) ? clData : [])
      setContractors(Array.isArray(coData) ? coData : [])
      setPayers(Array.isArray(pyData) ? pyData : [])
      if (Array.isArray(histData)) setHistory(histData)
      if (Array.isArray(usersData)) setAllUsersList(usersData)
    } catch (e) {
      console.error('Error loading data:', e)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [currentUser.id, currentUser.role, viewUserId])

  const logHistory = (action: string, description: string, currentSnapshot?: any) => {
    const snap = currentSnapshot || { clients, contractors, payers, orders }
    const entry: HistoryEntry = {
      id: Math.random().toString(36).slice(2, 8),
      timestamp: new Date().toLocaleString('ru-RU'),
      action,
      description,
      snapshot: snap,
      userId: currentUser.id
    }
    setHistory(h => [entry, ...h.slice(0, 49)])
    api.saveHistory(entry).catch(() => {})
  }

  // --- Snapshot Restore ---
  const handleRestoreSnapshot = async (entry: HistoryEntry) => {
    if (!entry.snapshot) return
    const confirmMsg = `Восстановить состояние базы данных на момент: "${entry.action} - ${entry.timestamp}"?`
    if (!window.confirm(confirmMsg)) return

    try {
      const { orders: snapOrders, clients: snapClients, contractors: snapContractors, payers: snapPayers } = entry.snapshot

      if (Array.isArray(snapOrders)) {
        setOrders(snapOrders)
        for (const o of snapOrders) await api.upsertOrder(o).catch(() => {})
      }
      if (Array.isArray(snapClients)) {
        setClients(snapClients)
        for (const c of snapClients) await api.upsertClient(c).catch(() => {})
      }
      if (Array.isArray(snapContractors)) {
        setContractors(snapContractors)
        for (const co of snapContractors) await api.upsertContractor(co).catch(() => {})
      }
      if (Array.isArray(snapPayers)) {
        setPayers(snapPayers)
        for (const p of snapPayers) await api.upsertPayer(p).catch(() => {})
      }

      logHistory('Восстановление снимка', `Восстановлен снимок #${entry.id} (${entry.action})`)
      alert('Состояние успешно восстановлено!')
    } catch (e) {
      alert('Ошибка при восстановлении снимка')
    }
  }

  // --- Orders Handlers ---
  const handleAddOrder = () => {
    const id = Math.random().toString(36).slice(2, 8)
    const newOrd: Order = {
      id,
      date: new Date().toISOString().slice(0, 10),
      clientId: clients[0]?.id || '',
      productName: 'Новый заказ',
      contractors: [],
      saleAmount: 0,
      paymentReceiverId: payers[0]?.id || '',
      paymentNote: '',
      paymentReceived: false,
      status: 'active',
      note: '',
      createdAt: new Date().toISOString(),
      userId: currentUser.id
    }
    const updated = [newOrd, ...orders]
    setOrders(updated)
    api.upsertOrder(newOrd).catch(() => {})
    logHistory('Создание заказа', `Создан заказ #${id} пользователем ${currentUser.name}`, { clients, contractors, payers, orders: updated })
  }

  const handleCopyOrder = (order: Order) => {
    const newId = Math.random().toString(36).slice(2, 8)
    const copy: Order = {
      ...order,
      id: newId,
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      userId: currentUser.id
    }
    const updated = [copy, ...orders]
    setOrders(updated)
    api.upsertOrder(copy).catch(() => {})
    logHistory('Копирование заказа', `Скопирован заказ #${order.id} -> #${newId}`, { clients, contractors, payers, orders: updated })
  }

  const handleDeleteOrder = (id: string) => {
    const updated = orders.filter(o => o.id !== id)
    setOrders(updated)
    api.deleteOrder(id).catch(() => {})
    logHistory('Удаление заказа', `Удален заказ #${id}`, { clients, contractors, payers, orders: updated })
  }

  const handleUpdateOrder = (updated: Order, logDescription?: string) => {
    const updatedOrders = orders.map(o => o.id === updated.id ? updated : o)
    setOrders(updatedOrders)
    api.upsertOrder({ ...updated, userId: updated.userId || currentUser.id }).catch(() => {})
    
    // Log history entry for edits
    const desc = logDescription || `Редактирование заказа #${updated.id}`
    logHistory('Редактирование заказа', desc, { clients, contractors, payers, orders: updatedOrders })
  }

  const handleConfirmAiOrder = (newOrder: Order, newClientsToCreate: Client[], newContractorsToCreate: Contractor[]) => {
    let updatedClients = [...clients]
    for (const c of newClientsToCreate) {
      if (!updatedClients.some(x => x.id === c.id)) {
        updatedClients.push(c)
        api.upsertClient(c).catch(() => {})
      }
    }
    if (newClientsToCreate.length > 0) setClients(updatedClients)

    let updatedContractors = [...contractors]
    for (const co of newContractorsToCreate) {
      if (!updatedContractors.some(x => x.id === co.id)) {
        updatedContractors.push(co)
        api.upsertContractor(co).catch(() => {})
      }
    }
    if (newContractorsToCreate.length > 0) setContractors(updatedContractors)

    const updatedOrders = [newOrder, ...orders]
    setOrders(updatedOrders)
    api.upsertOrder({ ...newOrder, userId: newOrder.userId || currentUser.id }).catch(() => {})
    logHistory('Создание заказа ИИ', `Заказ #${newOrder.id} создан ИИ помощником`, { clients: updatedClients, contractors: updatedContractors, payers, orders: updatedOrders })
  }

  // --- Clients Handlers ---
  const handleAddClient = () => {
    const newC: Client = {
      id: 'c_' + Math.random().toString(36).slice(2, 7),
      name: 'Новый клиент',
      phone: '',
      contactPerson: '',
      email: '',
      note: '',
      customFields: [],
      createdAt: new Date().toISOString(),
      userId: currentUser.id
    }
    const updated = [newC, ...clients]
    setClients(updated)
    api.upsertClient(newC).catch(() => {})
    logHistory('Создание клиента', `Добавлен клиент ${newC.name}`, { clients: updated, contractors, payers, orders })
  }

  const handleUpdateClient = (c: Client) => {
    const updatedClients = clients.map(item => item.id === c.id ? c : item)
    setClients(updatedClients)
    api.upsertClient(c).catch(() => {})
    logHistory('Правка клиента', `Изменены данные клиента ${c.name}`, { clients: updatedClients, contractors, payers, orders })
  }

  const handleDeleteClient = (id: string) => {
    const updated = clients.filter(c => c.id !== id)
    setClients(updated)
    api.deleteClient(id).catch(() => {})
    logHistory('Удаление клиента', `Удален клиент #${id}`, { clients: updated, contractors, payers, orders })
  }

  // --- Contractors Handlers ---
  const handleAddContractor = () => {
    const newCo: Contractor = {
      id: 'co_' + Math.random().toString(36).slice(2, 7),
      name: 'Новый подрядчик',
      phone: '',
      note: '',
      createdAt: new Date().toISOString(),
      userId: currentUser.id
    }
    const updated = [newCo, ...contractors]
    setContractors(updated)
    api.upsertContractor(newCo).catch(() => {})
    logHistory('Создание подрядчика', `Добавлен подрядчик ${newCo.name}`, { clients, contractors: updated, payers, orders })
  }

  const handleUpdateContractor = (co: Contractor) => {
    const updatedContractors = contractors.map(item => item.id === co.id ? co : item)
    setContractors(updatedContractors)
    api.upsertContractor(co).catch(() => {})
    logHistory('Правка подрядчика', `Изменены данные подрядчика ${co.name}`, { clients, contractors: updatedContractors, payers, orders })
  }

  const handleDeleteContractor = (id: string) => {
    const updated = contractors.filter(co => co.id !== id)
    setContractors(updated)
    api.deleteContractor(id).catch(() => {})
    logHistory('Удаление подрядчика', `Удален подрядчик #${id}`, { clients, contractors: updated, payers, orders })
  }

  // --- Payers Handlers ---
  const handleAddPayer = () => {
    const newP: Payer = {
      id: 'p_' + Math.random().toString(36).slice(2, 7),
      name: 'Новый плательщик',
      type: 'cashless',
      createdAt: new Date().toISOString(),
      userId: currentUser.id
    }
    const updated = [newP, ...payers]
    setPayers(updated)
    api.upsertPayer(newP).catch(() => {})
    logHistory('Создание плательщика', `Добавлен плательщик ${newP.name}`, { clients, contractors, payers: updated, orders })
  }

  const handleUpdatePayer = (p: Payer) => {
    const updatedPayers = payers.map(item => item.id === p.id ? p : item)
    setPayers(updatedPayers)
    api.upsertPayer(p).catch(() => {})
    logHistory('Правка плательщика', `Изменены данные плательщика ${p.name}`, { clients, contractors, payers: updatedPayers, orders })
  }

  const handleDeletePayer = (id: string) => {
    const updated = payers.filter(p => p.id !== id)
    setPayers(updated)
    api.deletePayer(id).catch(() => {})
    logHistory('Удаление плательщика', `Удален плательщик #${id}`, { clients, contractors, payers: updated, orders })
  }

  // Export / Import
  const handleExportJSON = () => {
    const data = JSON.stringify({ orders, clients, contractors, payers, history }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `crm-a29-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }

  const handleImportJSON = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async event => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        if (parsed.orders) {
          setOrders(parsed.orders)
          for (const o of parsed.orders) await api.upsertOrder({ ...o, userId: currentUser.id }).catch(() => {})
        }
        if (parsed.clients) {
          setClients(parsed.clients)
          for (const c of parsed.clients) await api.upsertClient(c).catch(() => {})
        }
        if (parsed.contractors) {
          setContractors(parsed.contractors)
          for (const co of parsed.contractors) await api.upsertContractor(co).catch(() => {})
        }
        if (parsed.payers) {
          setPayers(parsed.payers)
          for (const p of parsed.payers) await api.upsertPayer(p).catch(() => {})
        }
        alert('Данные A29 CRM успешно импортированы!')
      } catch (err) {
        alert('Ошибка при импорте JSON файла')
      }
    }
    reader.readAsText(file)
  }

  const handleLoadMoreHistory = async (limit: number) => {
    try {
      const data = await api.fetchHistory(limit)
      if (Array.isArray(data)) setHistory(data)
    } catch (e) {
      console.error('Error fetching history:', e)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] bg-[#e5e8ed]">
      {/* Top Navigation Bar */}
      <NavigationTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        ordersCount={orders.length}
        clientsCount={clients.length}
        contractorsCount={contractors.length}
        payersCount={payers.length}
        historyCount={history.length}
        isAdmin={currentUser.role === 'admin'}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
      />

      {/* Admin Manager Database Switcher Bar */}
      {currentUser.role === 'admin' && (
        <div className="bg-[#fff8d6] border-b border-[#e5ba00] px-3 py-1 flex items-center justify-between gap-2 text-xs select-none shadow-2xs">
          <span className="font-bold text-[#1c1d1f] flex items-center gap-1.5">
            🛡️ Панель Администратора:
          </span>
          <div className="flex items-center gap-2">
            <label className="font-semibold text-slate-700">Просмотр данных:</label>
            <select
              value={viewUserId}
              onChange={e => setViewUserId(e.target.value)}
              className="bg-white border border-[#d9a800] rounded px-2.5 py-0.5 text-xs font-bold outline-none cursor-pointer text-[#1c1d1f] shadow-2xs"
            >
              <option value="all">🌐 Все менеджеры (Сводная база агентства)</option>
              {allUsersList.map(u => (
                <option key={u.id} value={u.id}>
                  👤 {u.name} ({u.username})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Tab Contents */}
      {activeTab === 'orders' && (
        <OrdersTab
          orders={orders}
          clients={clients}
          contractors={contractors}
          payers={payers}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onAddOrder={handleAddOrder}
          onCopyOrder={handleCopyOrder}
          onDeleteOrder={handleDeleteOrder}
          onUpdateOrder={handleUpdateOrder}
          onConfirmAiOrder={handleConfirmAiOrder}
        />
      )}

      {activeTab === 'clients' && (
        <ClientsTab
          clients={clients}
          onAddClient={handleAddClient}
          onUpdateClient={handleUpdateClient}
          onDeleteClient={handleDeleteClient}
        />
      )}

      {activeTab === 'contractors' && (
        <ContractorsTab
          contractors={contractors}
          onAddContractor={handleAddContractor}
          onUpdateContractor={handleUpdateContractor}
          onDeleteContractor={handleDeleteContractor}
        />
      )}

      {activeTab === 'payers' && (
        <PayersTab
          payers={payers}
          onAddPayer={handleAddPayer}
          onUpdatePayer={handleUpdatePayer}
          onDeletePayer={handleDeletePayer}
        />
      )}

      {activeTab === 'reports' && (
        <ReportsTab
          orders={orders}
          clients={clients}
          contractors={contractors}
          payers={payers}
          selectedMonth={selectedMonth}
          onUpdateOrder={handleUpdateOrder}
          onLogHistory={logHistory}
        />
      )}

      {activeTab === 'history' && (
        <HistoryTab
          history={history}
          onClearHistory={() => {
            setHistory([])
            api.clearHistory().catch(() => {})
          }}
          onRestoreSnapshot={handleRestoreSnapshot}
          onLoadMoreHistory={handleLoadMoreHistory}
        />
      )}

      {activeTab === 'users' && currentUser.role === 'admin' && (
        <UsersTab currentUser={currentUser} />
      )}
    </div>
  )
}

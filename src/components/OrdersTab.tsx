import React, { useState, useEffect, Fragment } from 'react'
import {
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Search
} from 'lucide-react'
import type { Order, Client, Contractor, Payer, OrderContractorRow } from '../types'
import AiOrderModal from './AiOrderModal'

interface OrdersTabProps {
  orders: Order[]
  clients: Client[]
  contractors: Contractor[]
  payers: Payer[]
  selectedMonth: string
  setSelectedMonth: (m: string) => void
  dateFrom: string
  setDateFrom: (d: string) => void
  dateTo: string
  setDateTo: (d: string) => void
  statusFilter: 'all' | 'active' | 'completed'
  setStatusFilter: (s: 'all' | 'active' | 'completed') => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  onAddOrder: () => void
  onCopyOrder: (order: Order) => void
  onDeleteOrder: (id: string) => void
  onUpdateOrder: (updated: Order, actionDesc: string) => void
  onConfirmAiOrder: (data: any) => void
}

const EDITABLE_FIELDS = [
  'date',
  'clientId',
  'productName',
  'saleAmount',
  'paymentReceiverId',
  'paymentNote',
  'note'
]

export default function OrdersTab({
  orders,
  clients,
  contractors,
  payers,
  selectedMonth,
  setSelectedMonth,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  onAddOrder,
  onCopyOrder,
  onDeleteOrder,
  onUpdateOrder,
  onConfirmAiOrder
}: OrdersTabProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [activeCell, setActiveCell] = useState<{
    oid: string
    field: string
    contractorRowId?: string
  } | null>(null)
  const [editBar, setEditBar] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)

  // Sync Top Edit-bar with selected cell content (both main orders and contractor sub-tables)
  useEffect(() => {
    if (!activeCell) return
    const order = orders.find(o => o.id === activeCell.oid)
    if (!order) return

    if (activeCell.contractorRowId) {
      const cr = (order.contractors || []).find(r => r.id === activeCell.contractorRowId)
      if (!cr) return
      if (activeCell.field === 'crDescription') {
        setEditBar(cr.description || '')
      } else if (activeCell.field === 'crCostFormula') {
        setEditBar(cr.costFormula || (cr.costValue ? String(cr.costValue) : ''))
      } else if (activeCell.field === 'crNote') {
        setEditBar(cr.note || '')
      }
    } else {
      if (activeCell.field === 'productName') {
        setEditBar(order.productName || '')
      } else if (activeCell.field === 'saleAmount') {
        setEditBar(order.saleFormula || String(order.saleAmount || ''))
      } else if (activeCell.field === 'note') {
        setEditBar(order.note || '')
      } else if (activeCell.field === 'paymentNote') {
        setEditBar(order.paymentNote || '')
      }
    }
  }, [activeCell, orders])

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Safe formula evaluation
  const evalFormula = (expr: string): number => {
    if (!expr) return 0
    let clean = expr.trim()
    if (clean.startsWith('=')) clean = clean.slice(1).trim()
    if (!clean) return 0
    clean = clean.replace(/,/g, '.').replace(/\*\*/g, '*')
    if (!/^[0-9+\-*/(). ]+$/.test(clean)) return 0
    try {
      const res = Function(`"use strict"; return (${clean})`)()
      return typeof res === 'number' && !isNaN(res) ? Math.round(res * 100) / 100 : 0
    } catch {
      return 0
    }
  }

  // Calculate costs, profit, rent%
  const calcOrderTotals = (order: Order) => {
    const list = order.contractors || []
    const costs = list.reduce((sum, c) => sum + (Number(c.costValue) || 0), 0)
    const sale = Number(order.saleAmount) || 0
    const profit = sale - costs
    const rent = sale > 0 ? (profit / sale) * 100 : 0
    return { costs, sale, profit, rent }
  }

  const isCashPayer = (payerId: string) => {
    const p = payers.find(x => x.id === payerId)
    return p?.type === 'cash'
  }

  // Deep Filter logic (includes searching inside sub-contractor records and fields)
  const filteredOrders = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false

    if (dateFrom || dateTo) {
      if (dateFrom && o.date && o.date < dateFrom) return false
      if (dateTo && o.date && o.date > dateTo) return false
    } else if (selectedMonth && o.date && !o.date.startsWith(selectedMonth)) {
      return false
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim()
      const clientName = (clients.find(c => c.id === o.clientId)?.name || '').toLowerCase()
      const prod = (o.productName || '').toLowerCase()
      const note = (o.note || '').toLowerCase()
      const payerName = (payers.find(p => p.id === o.paymentReceiverId)?.name || '').toLowerCase()
      const paymentNote = (o.paymentNote || '').toLowerCase()
      const orderId = (o.id || '').toLowerCase()

      // Deep search inside contractor rows
      const contractorMatch = (o.contractors || []).some(cr => {
        const coName = (contractors.find(c => c.id === cr.contractorId)?.name || '').toLowerCase()
        const desc = (cr.description || '').toLowerCase()
        const crNote = (cr.note || '').toLowerCase()
        const formula = (cr.costFormula || '').toLowerCase()
        return coName.includes(q) || desc.includes(q) || crNote.includes(q) || formula.includes(q)
      })

      return (
        prod.includes(q) ||
        clientName.includes(q) ||
        note.includes(q) ||
        orderId.includes(q) ||
        payerName.includes(q) ||
        paymentNote.includes(q) ||
        contractorMatch
      )
    }
    return true
  })

  // Dynamic row expansion (expands during search without mutating manual collapse states)
  const isRowExpanded = (order: Order) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const contractorMatch = (order.contractors || []).some(cr => {
        const coName = (contractors.find(c => c.id === cr.contractorId)?.name || '').toLowerCase()
        const desc = (cr.description || '').toLowerCase()
        const crNote = (cr.note || '').toLowerCase()
        const formula = (cr.costFormula || '').toLowerCase()
        return coName.includes(q) || desc.includes(q) || crNote.includes(q) || formula.includes(q)
      })
      if (contractorMatch) return true
    }
    return !!expanded[order.id]
  }

  const handleCollapseAll = () => {
    setExpanded({})
  }

  // Keyboard Arrow Navigation Handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>, orderId: string, currentField: string) => {
    const orderIndex = filteredOrders.findIndex(o => o.id === orderId)
    const fieldIndex = EDITABLE_FIELDS.indexOf(currentField)
    if (orderIndex === -1 || fieldIndex === -1) return

    const inputEl = e.currentTarget as HTMLInputElement

    let nextOrderId = orderId
    let nextField = currentField
    let shouldNavigate = false

    if (e.key === 'ArrowRight') {
      const isAtEnd = inputEl.type !== 'text' || inputEl.selectionStart === inputEl.value.length
      if (isAtEnd) {
        if (fieldIndex < EDITABLE_FIELDS.length - 1) {
          nextField = EDITABLE_FIELDS[fieldIndex + 1]
        } else if (orderIndex < filteredOrders.length - 1) {
          nextOrderId = filteredOrders[orderIndex + 1].id
          nextField = EDITABLE_FIELDS[0]
        }
        shouldNavigate = true
      }
    } else if (e.key === 'ArrowLeft') {
      const isAtStart = inputEl.type !== 'text' || inputEl.selectionStart === 0
      if (isAtStart) {
        if (fieldIndex > 0) {
          nextField = EDITABLE_FIELDS[fieldIndex - 1]
        } else if (orderIndex > 0) {
          nextOrderId = filteredOrders[orderIndex - 1].id
          nextField = EDITABLE_FIELDS[EDITABLE_FIELDS.length - 1]
        }
        shouldNavigate = true
      }
    } else if (e.key === 'ArrowDown' || (e.key === 'Enter' && inputEl.tagName !== 'TEXTAREA')) {
      if (orderIndex < filteredOrders.length - 1) {
        nextOrderId = filteredOrders[orderIndex + 1].id
        shouldNavigate = true
      }
    } else if (e.key === 'ArrowUp') {
      if (orderIndex > 0) {
        nextOrderId = filteredOrders[orderIndex - 1].id
        shouldNavigate = true
      }
    }

    if (shouldNavigate) {
      e.preventDefault()
      const targetId = `cell-${nextOrderId}-${nextField}`
      const targetEl = document.getElementById(targetId)
      if (targetEl) {
        targetEl.focus()
        setActiveCell({ oid: nextOrderId, field: nextField })
        const targetOrder = filteredOrders.find(o => o.id === nextOrderId)
        if (targetOrder) {
          if (nextField === 'productName') setEditBar(targetOrder.productName || '')
          else if (nextField === 'saleAmount') setEditBar(targetOrder.saleFormula || String(targetOrder.saleAmount))
        }
      }
    }
  }

  // Clear date bounds
  const handleResetDates = () => {
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top Filter & Toolbar */}
      <div className="bg-[#f0f2f5] border-b border-[#b8bdc5] px-3 py-1.5 flex flex-wrap items-center gap-2 shadow-2xs text-xs select-none">
        {/* Month Selector */}
        <div className="flex items-center gap-1">
          <label className="font-bold text-[#1c1d1f]">Месяц:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => {
              setSelectedMonth(e.target.value)
              setDateFrom('')
              setDateTo('')
            }}
            className="border border-[#b8bdc5] rounded px-2 py-0.5 text-xs outline-none bg-white text-[#1c1d1f] font-semibold cursor-pointer"
          />
        </div>

        {/* Date Interval Selector */}
        <div className="flex items-center gap-1 border-l border-[#b8bdc5] pl-2">
          <label className="font-bold text-[#1c1d1f]">Дата с:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="border border-[#b8bdc5] rounded px-1.5 py-0.5 text-xs outline-none bg-white text-[#1c1d1f] cursor-pointer"
          />
          <label className="font-bold text-[#1c1d1f]">по:</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="border border-[#b8bdc5] rounded px-1.5 py-0.5 text-xs outline-none bg-white text-[#1c1d1f] cursor-pointer"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={handleResetDates}
              className="text-[10px] text-red-600 hover:text-red-800 font-bold ml-1 cursor-pointer"
              title="Сбросить интервал дат"
            >
              ✕ сброс
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-[#d9dce1] p-0.5 rounded border border-[#b8bdc5]">
          <button
            className={`px-2.5 py-0.5 text-xs rounded font-semibold cursor-pointer ${statusFilter === 'all' ? 'bg-[#ffcc00] text-[#1c1d1f] shadow-2xs border border-[#d9a800]' : 'text-[#44474e]'}`}
            onClick={() => setStatusFilter('all')}
          >
            Все
          </button>
          <button
            className={`px-2.5 py-0.5 text-xs rounded font-semibold cursor-pointer ${statusFilter === 'active' ? 'bg-[#ffcc00] text-[#1c1d1f] shadow-2xs border border-[#d9a800]' : 'text-[#44474e]'}`}
            onClick={() => setStatusFilter('active')}
          >
            В работе
          </button>
          <button
            className={`px-2.5 py-0.5 text-xs rounded font-semibold cursor-pointer ${statusFilter === 'completed' ? 'bg-[#ffcc00] text-[#1c1d1f] shadow-2xs border border-[#d9a800]' : 'text-[#44474e]'}`}
            onClick={() => setStatusFilter('completed')}
          >
            Выполненные
          </button>
        </div>

        {/* Deep Search Input */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск заказов и подрядчиков..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="border border-[#b8bdc5] rounded pl-7 pr-2.5 py-0.5 text-xs outline-none w-52 bg-white text-[#1c1d1f] focus:border-[#ffcc00]"
          />
        </div>

        {Object.keys(expanded).length > 0 && (
          <button
            onClick={handleCollapseAll}
            className="text-[11px] bg-white border border-[#b8bdc5] hover:bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded cursor-pointer transition shadow-2xs"
            title="Свернуть все открытые подтаблицы"
          >
            ▲ Свернуть все ({Object.keys(expanded).length})
          </button>
        )}

        <span className="text-xs text-[#555a64] font-medium ml-auto">Строк: {filteredOrders.length} (Навигация: ← → ↑ ↓)</span>

        <button
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded px-3.5 py-1 text-xs font-bold cursor-pointer transition shadow-xs active:scale-95 flex items-center gap-1.5"
          onClick={() => setIsAiModalOpen(true)}
        >
          <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" /> ✨ ИИ Помощник
        </button>

        <button
          className="bg-gradient-to-b from-[#ffdb4d] to-[#ffcc00] hover:from-[#ffcc00] hover:to-[#e6b800] text-[#1c1d1f] border border-[#d9a800] rounded px-4 py-1 text-xs font-bold cursor-pointer transition shadow-xs active:scale-95 flex items-center gap-1"
          onClick={onAddOrder}
        >
          <Plus className="w-3.5 h-3.5" /> Создать заказ
        </button>
      </div>

      {/* Quick Property Bar — Always syncs with active cell text (orders or contractor sub-tables) */}
      <div className="bg-white border-b border-[#b8bdc5] px-3 py-1.5 shadow-2xs border-l-4 border-l-[#ffcc00]">
        <div className="text-[10px] font-bold text-[#555a64] mb-0.5 uppercase tracking-wide">
          {activeCell
            ? `Редактирование: ${activeCell.field} (заказ #${activeCell.oid.slice(0, 6)})`
            : 'Строка ввода — выберите ячейку (навигация стрелками ← → ↑ ↓)'}
        </div>
        <textarea
          className="w-full min-h-[34px] border border-[#b8bdc5] rounded p-1.5 text-xs outline-none resize-y focus:border-[#ffcc00] font-mono text-[#1c1d1f] bg-[#fffdf0]"
          value={editBar}
          onChange={e => {
            const v = e.target.value
            setEditBar(v)
            if (!activeCell) return
            const targetOrder = orders.find(o => o.id === activeCell.oid)
            if (!targetOrder) return

            if (activeCell.contractorRowId) {
              const updatedContractors = (targetOrder.contractors || []).map(cr => {
                if (cr.id !== activeCell.contractorRowId) return cr
                if (activeCell.field === 'crDescription') {
                  return { ...cr, description: v }
                } else if (activeCell.field === 'crCostFormula') {
                  const calcVal = evalFormula(v)
                  return { ...cr, costFormula: v, costValue: calcVal }
                } else if (activeCell.field === 'crNote') {
                  return { ...cr, note: v }
                }
                return cr
              })
              onUpdateOrder({ ...targetOrder, contractors: updatedContractors }, `Изменение подрядчика в заказе #${targetOrder.id}`)
            } else {
              let updated = { ...targetOrder }
              if (activeCell.field === 'productName') {
                updated.productName = v
              } else if (activeCell.field === 'saleAmount') {
                const s = v.trim()
                const hasMath = s.startsWith('=') || /[+\-*/()]/.test(s)
                const calcVal = evalFormula(s)
                if (hasMath) {
                  updated.saleAmount = calcVal
                  updated.saleFormula = s.startsWith('=') ? s : '=' + s
                } else {
                  updated.saleAmount = calcVal
                  updated.saleFormula = ''
                }
              } else if (activeCell.field === 'note') {
                updated.note = v
              } else if (activeCell.field === 'paymentNote') {
                updated.paymentNote = v
              }
              onUpdateOrder(updated, `Правка поля ${activeCell.field} в заказе #${targetOrder.id}`)
            }
          }}
          placeholder="Ввод текста или формулы (начинается с =)..."
        />
      </div>

      {/* Sheet Table */}
      <div className="flex-1 overflow-auto bg-white border-b border-[#b8bdc5]">
        <table className="sheet-grid w-full">
          <thead>
            <tr>
              <th className="sheet-header" style={{ width: 45 }}>№</th>
              <th className="sheet-header" style={{ width: 45 }}>Стат</th>
              <th className="sheet-header" style={{ width: 95 }}>Дата</th>
              <th className="sheet-header" style={{ width: 160 }}>Контрагент (Клиент)</th>
              <th className="sheet-header" style={{ width: 220 }}>Номенклатура (Продукция)</th>
              <th className="sheet-header" style={{ width: 70 }}>Затраты</th>
              <th className="sheet-header" style={{ width: 70 }}>Сумма реал.</th>
              <th className="sheet-header" style={{ width: 70 }}>Прибыль</th>
              <th className="sheet-header" style={{ width: 60 }}>Рент%</th>
              <th className="sheet-header" style={{ width: 150 }}>Счет получателя</th>
              <th className="sheet-header" style={{ width: 35 }}>№ счета</th>
              <th className="sheet-header" style={{ width: 40 }}>Опл</th>
              <th className="sheet-header" style={{ width: 100 }}>Комментарий</th>
              <th className="sheet-header" style={{ width: 130 }}>Действ</th>
            </tr>
          </thead>

          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={14} className="text-center py-8 text-[#777d88] text-xs font-medium">
                  {searchQuery ? `По запросу "${searchQuery}" ничего не найдено` : 'Нет документов в выбранном периоде. Нажмите + Создать заказ.'}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order, idx) => {
                const t = calcOrderTotals(order)
                const isExp = isRowExpanded(order)
                const cash = isCashPayer(order.paymentReceiverId)
                const isCellActive = (field: string) => activeCell?.oid === order.id && activeCell?.field === field && !activeCell.contractorRowId
                const isCompleted = order.status === 'completed'

                return (
                  <Fragment key={order.id}>
                    <tr className={`sheet-row text-xs transition-all duration-150 ${
                      isCompleted ? 'status-completed' : 'status-active'
                    }`}>
                      {/* NON-editable cell # */}
                      <td
                        className="sheet-cell text-center cursor-pointer select-none font-bold text-[#44474e] bg-[#f4f6f8]"
                        onClick={() => toggleExpand(order.id)}
                        title="Раскрыть / скрыть подтаблицу подрядчиков"
                      >
                        <div className="flex items-center justify-center gap-0.5">
                          <span>{idx + 1}</span>
                          {isExp ? <ChevronDown className="w-3 h-3 text-[#d9a800]" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="sheet-cell text-center p-0">
                        <button
                          className="w-full h-full flex items-center justify-center cursor-pointer"
                          onClick={() => {
                            const newStatus = isCompleted ? 'active' : 'completed'
                            onUpdateOrder({ ...order, status: newStatus }, `Смена статуса заказа #${order.id} на ${newStatus}`)
                          }}
                          title={isCompleted ? 'Пометить как В работе' : 'Пометить как Выполнен'}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-300 hover:text-amber-500" />
                          )}
                        </button>
                      </td>

                      {/* Editable Date */}
                      <td className={`sheet-cell p-0 ${isCellActive('date') ? 'sheet-cell-active' : ''}`}>
                        <input
                          id={`cell-${order.id}-date`}
                          type="date"
                          value={order.date || ''}
                          onFocus={() => setActiveCell({ oid: order.id, field: 'date' })}
                          onKeyDown={e => handleKeyDown(e, order.id, 'date')}
                          onChange={e => onUpdateOrder({ ...order, date: e.target.value }, `Изменение даты заказа #${order.id}`)}
                          className="w-full h-full text-xs px-1 outline-none bg-transparent cursor-pointer font-mono"
                        />
                      </td>

                      {/* Editable Client */}
                      <td className={`sheet-cell p-0 ${isCellActive('clientId') ? 'sheet-cell-active' : ''}`}>
                        <select
                          id={`cell-${order.id}-clientId`}
                          value={order.clientId || ''}
                          onFocus={() => setActiveCell({ oid: order.id, field: 'clientId' })}
                          onKeyDown={e => handleKeyDown(e, order.id, 'clientId')}
                          onChange={e => onUpdateOrder({ ...order, clientId: e.target.value }, `Изменение клиента заказа #${order.id}`)}
                          className="w-full h-full text-xs px-1 outline-none bg-transparent cursor-pointer font-semibold"
                        >
                          <option value="">-- Выберите --</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Editable Product Name */}
                      <td className={`sheet-cell p-0 ${isCellActive('productName') ? 'sheet-cell-active' : ''}`}>
                        <input
                          id={`cell-${order.id}-productName`}
                          type="text"
                          value={order.productName || ''}
                          onFocus={() => {
                            setActiveCell({ oid: order.id, field: 'productName' })
                            setEditBar(order.productName || '')
                          }}
                          onKeyDown={e => handleKeyDown(e, order.id, 'productName')}
                          onChange={e => {
                            setEditBar(e.target.value)
                            onUpdateOrder({ ...order, productName: e.target.value }, `Изменение продукции заказа #${order.id}`)
                          }}
                          className="w-full h-full px-1 text-xs outline-none bg-transparent"
                          placeholder="Новый заказ"
                        />
                      </td>

                      {/* NON-editable Costs */}
                      <td className="sheet-cell text-right text-slate-700 font-bold bg-[#f9fafb]">
                        <div className="cell-truncate">{t.costs.toLocaleString('ru-RU')} ₽</div>
                      </td>

                      {/* Editable Sale Amount */}
                      <td className={`sheet-cell p-0 ${isCellActive('saleAmount') ? 'sheet-cell-active' : ''}`}>
                        <input
                          id={`cell-${order.id}-saleAmount`}
                          type="text"
                          value={
                            isCellActive('saleAmount')
                              ? (order.saleFormula || (order.saleAmount ? String(order.saleAmount) : ''))
                              : (order.saleAmount ? Number(order.saleAmount).toLocaleString('ru-RU') : '')
                          }
                          title={order.saleFormula ? `Формула: ${order.saleFormula}` : undefined}
                          onFocus={() => {
                            setActiveCell({ oid: order.id, field: 'saleAmount' })
                            setEditBar(order.saleFormula || String(order.saleAmount || ''))
                          }}
                          onKeyDown={e => handleKeyDown(e, order.id, 'saleAmount')}
                          onChange={e => {
                            const val = e.target.value
                            setEditBar(val)
                            const s = val.trim()
                            const hasMath = s.startsWith('=') || /[+\-*/()]/.test(s)
                            const calcVal = evalFormula(s)
                            let updated = { ...order }
                            if (hasMath) {
                              updated.saleAmount = calcVal
                              updated.saleFormula = s.startsWith('=') ? s : '=' + s
                            } else {
                              updated.saleAmount = calcVal
                              updated.saleFormula = ''
                            }
                            onUpdateOrder(updated, `Изменение суммы реализации заказа #${order.id}`)
                          }}
                          className="w-full h-full px-1 text-xs text-right font-bold outline-none bg-transparent text-[#1e40af]"
                        />
                      </td>

                      {/* NON-editable Profit */}
                      <td
                        className="sheet-cell text-right font-extrabold bg-[#f9fafb]"
                        style={{ color: t.profit >= 0 ? '#15803d' : '#b91c1c' }}
                      >
                        <div className="cell-truncate">{t.profit.toLocaleString('ru-RU')} ₽</div>
                      </td>

                      {/* NON-editable Rent % */}
                      <td className="sheet-cell text-right text-slate-600 font-medium bg-[#f9fafb]">
                        <div className="cell-truncate">{t.rent.toFixed(1)}%</div>
                      </td>

                      {/* Editable Payer Receiver */}
                      <td className={`sheet-cell p-0 ${isCellActive('paymentReceiverId') ? 'sheet-cell-active' : ''}`}>
                        <select
                          id={`cell-${order.id}-paymentReceiverId`}
                          value={order.paymentReceiverId || ''}
                          onFocus={() => setActiveCell({ oid: order.id, field: 'paymentReceiverId' })}
                          onKeyDown={e => handleKeyDown(e, order.id, 'paymentReceiverId')}
                          onChange={e => {
                            const newPayerId = e.target.value
                            const isNewCash = isCashPayer(newPayerId)
                            onUpdateOrder({
                              ...order,
                              paymentReceiverId: newPayerId,
                              paymentNote: isNewCash ? '' : order.paymentNote
                            }, `Изменение плательщика заказа #${order.id}`)
                          }}
                          className="w-full h-full text-xs px-1 outline-none bg-transparent cursor-pointer"
                        >
                          <option value="">-- Выберите --</option>
                          {payers.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Editable Payment Note */}
                      <td className={`sheet-cell p-0 ${isCellActive('paymentNote') ? 'sheet-cell-active' : ''}`}>
                        {cash ? (
                          <div className="text-center text-slate-400 bg-slate-200/80 h-full flex items-center justify-center font-bold">—</div>
                        ) : (
                          <input
                            id={`cell-${order.id}-paymentNote`}
                            type="text"
                            placeholder="№ счета"
                            value={order.paymentNote || ''}
                            onFocus={() => {
                              setActiveCell({ oid: order.id, field: 'paymentNote' })
                              setEditBar(order.paymentNote || '')
                            }}
                            onKeyDown={e => handleKeyDown(e, order.id, 'paymentNote')}
                            onChange={e => {
                              setEditBar(e.target.value)
                              onUpdateOrder({ ...order, paymentNote: e.target.value }, `Изменение № счета заказа #${order.id}`)
                            }}
                            className="w-full h-full px-1 text-xs outline-none bg-transparent"
                          />
                        )}
                      </td>

                      {/* Editable Paid Checkbox */}
                      <td className="sheet-cell text-center p-0">
                        <input
                          type="checkbox"
                          checked={!!order.paymentReceived}
                          onChange={e => onUpdateOrder({ ...order, paymentReceived: e.target.checked }, `Изменение оплаты заказа #${order.id}`)}
                          className="cursor-pointer accent-[#ffcc00]"
                        />
                      </td>

                      {/* Editable Note */}
                      <td className={`sheet-cell p-0 ${isCellActive('note') ? 'sheet-cell-active' : ''}`}>
                        <input
                          id={`cell-${order.id}-note`}
                          type="text"
                          value={order.note || ''}
                          onFocus={() => {
                            setActiveCell({ oid: order.id, field: 'note' })
                            setEditBar(order.note || '')
                          }}
                          onKeyDown={e => handleKeyDown(e, order.id, 'note')}
                          onChange={e => {
                            setEditBar(e.target.value)
                            onUpdateOrder({ ...order, note: e.target.value }, `Изменение комментария заказа #${order.id}`)
                          }}
                          className="w-full h-full px-1 text-xs outline-none bg-transparent"
                          placeholder="Комментарий..."
                        />
                      </td>

                      {/* Actions */}
                      <td className="sheet-cell text-center p-0">
                        <div className="flex items-center justify-center gap-1.5 w-full h-full px-1">
                          <button
                            title={`Скопировать уникальный номер заказа (#${order.id})`}
                            className="text-[10px] px-1 py-0.5 font-bold cursor-pointer transition text-[#1e40af] hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded font-mono shrink-0"
                            onClick={() => {
                              navigator.clipboard.writeText(order.id)
                              setCopiedId(order.id)
                              setTimeout(() => setCopiedId(null), 1500)
                            }}
                          >
                            {copiedId === order.id ? '✓ OK' : `#${order.id.slice(0, 4)}`}
                          </button>
                          <button
                            title="Дублировать заказ"
                            className="text-slate-600 hover:text-blue-600 p-0.5 cursor-pointer"
                            onClick={() => onCopyOrder(order)}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Удалить заказ"
                            className="text-red-600 hover:text-red-800 p-0.5 cursor-pointer"
                            onClick={() => onDeleteOrder(order.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDED CONTRACTOR SUB-TABLE */}
                    {isExp && (
                      <tr className="bg-[#fcfbe3] border-b-2 border-b-[#d9a800]">
                        <td colSpan={14} className="p-2 pl-10">
                          <div className="bg-white border border-[#b8bdc5] rounded shadow-2xs overflow-hidden">
                            <div className="bg-[#e6e9ed] px-2.5 py-1 border-b border-[#b8bdc5] flex justify-between items-center text-xs font-bold text-[#1c1d1f]">
                              <span>Подрядчики и затраты по заказу #{order.id} (Затраты: {t.costs.toLocaleString('ru-RU')} ₽)</span>
                              <button
                                className="bg-[#ffcc00] hover:bg-[#e6b800] text-[#1c1d1f] border border-[#d9a800] rounded px-2 py-0.5 text-[11px] font-bold cursor-pointer shadow-2xs flex items-center gap-1"
                                onClick={() => {
                                  const newRow: OrderContractorRow = {
                                    id: 'cr_' + Math.random().toString(36).slice(2, 7),
                                    contractorId: '', // Default to -- Выберите --
                                    description: '',
                                    costFormula: '',
                                    costValue: 0,
                                    payerId: '', // Default to -- Выберите --
                                    paid: false,
                                    reconciled: false,
                                    note: ''
                                  }
                                  const updatedContractors = [...(order.contractors || []), newRow]
                                  onUpdateOrder({ ...order, contractors: updatedContractors }, `Добавлен новый подрядчик в заказ #${order.id}`)
                                }}
                              >
                                <Plus className="w-3 h-3" /> + Добавить подрядчика
                              </button>
                            </div>

                            <table className="sheet-grid w-full">
                              <thead>
                                <tr>
                                  <th className="sheet-header" style={{ width: 140 }}>Подрядчик</th>
                                  <th className="sheet-header">Описание работ</th>
                                  <th className="sheet-header" style={{ width: 120 }}>Формула (=)</th>
                                  <th className="sheet-header" style={{ width: 80 }}>=Стоимость</th>
                                  <th className="sheet-header" style={{ width: 140 }}>Плательщик</th>
                                  <th className="sheet-header" style={{ width: 40 }}>Опл</th>
                                  <th className="sheet-header" style={{ width: 45 }}>Сверка</th>
                                  <th className="sheet-header" style={{ width: 100 }}>Примечание</th>
                                  <th className="sheet-header" style={{ width: 40 }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {(order.contractors || []).length === 0 ? (
                                  <tr>
                                    <td colSpan={9} className="text-center py-3 text-slate-400 text-xs">
                                      Подрядчики не добавлены. Нажмите "+ Добавить подрядчика".
                                    </td>
                                  </tr>
                                ) : (
                                  (order.contractors || []).map(cr => {
                                    const isCrActive = (field: string) =>
                                      activeCell?.oid === order.id &&
                                      activeCell?.field === field &&
                                      activeCell?.contractorRowId === cr.id

                                    return (
                                      <tr key={cr.id} className="hover:bg-[#fff9d6] text-xs">
                                        {/* Contractor Select */}
                                        <td className="sheet-cell p-0">
                                          <select
                                            value={cr.contractorId || ''}
                                            onChange={e => {
                                              const updatedRows = (order.contractors || []).map(r => r.id === cr.id ? { ...r, contractorId: e.target.value } : r)
                                              onUpdateOrder({ ...order, contractors: updatedRows }, `Обновлен подрядчик`)
                                            }}
                                            className="w-full h-full text-xs px-1 outline-none bg-transparent cursor-pointer font-semibold"
                                          >
                                            <option value="">-- Выберите --</option>
                                            {contractors.map(c => (
                                              <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                          </select>
                                        </td>

                                        {/* Work Description Input (Syncs with Top Edit-Bar) */}
                                        <td className={`sheet-cell p-0 ${isCrActive('crDescription') ? 'sheet-cell-active' : ''}`}>
                                          <input
                                            type="text"
                                            value={cr.description || ''}
                                            onFocus={() => {
                                              setActiveCell({ oid: order.id, field: 'crDescription', contractorRowId: cr.id })
                                              setEditBar(cr.description || '')
                                            }}
                                            onChange={e => {
                                              const val = e.target.value
                                              setEditBar(val)
                                              const updatedRows = (order.contractors || []).map(r => r.id === cr.id ? { ...r, description: val } : r)
                                              onUpdateOrder({ ...order, contractors: updatedRows }, `Обновлено описание подрядчика`)
                                            }}
                                            className="w-full h-full px-1 text-xs outline-none bg-transparent"
                                            placeholder="Описание работы..."
                                          />
                                        </td>

                                        {/* Cost Formula Input (Syncs with Top Edit-Bar, Empty Placeholder) */}
                                        <td className={`sheet-cell p-0 ${isCrActive('crCostFormula') ? 'sheet-cell-active' : ''}`}>
                                          <input
                                            type="text"
                                            value={cr.costFormula || (cr.costValue ? String(cr.costValue) : '')}
                                            onFocus={() => {
                                              setActiveCell({ oid: order.id, field: 'crCostFormula', contractorRowId: cr.id })
                                              setEditBar(cr.costFormula || (cr.costValue ? String(cr.costValue) : ''))
                                            }}
                                            onChange={e => {
                                              const val = e.target.value
                                              setEditBar(val)
                                              const calcVal = evalFormula(val)
                                              const updatedRows = (order.contractors || []).map(r => r.id === cr.id ? { ...r, costFormula: val, costValue: calcVal } : r)
                                              onUpdateOrder({ ...order, contractors: updatedRows }, `Обновлена формула подрядчика`)
                                            }}
                                            className="w-full h-full px-1 text-xs text-right outline-none bg-transparent font-mono text-[#b91c1c]"
                                            placeholder=""
                                          />
                                        </td>

                                        {/* Computed Cost Result */}
                                        <td className="sheet-cell text-right font-bold text-slate-800 bg-[#f9fafb]">
                                          <div className="cell-truncate">{(cr.costValue || 0).toLocaleString('ru-RU')} ₽</div>
                                        </td>

                                        {/* Payer Select */}
                                        <td className="sheet-cell p-0">
                                          <select
                                            value={cr.payerId || ''}
                                            onChange={e => {
                                              const updatedRows = (order.contractors || []).map(r => r.id === cr.id ? { ...r, payerId: e.target.value } : r)
                                              onUpdateOrder({ ...order, contractors: updatedRows }, `Обновлен плательщик подрядчика`)
                                            }}
                                            className="w-full h-full text-xs px-1 outline-none bg-transparent cursor-pointer"
                                          >
                                            <option value="">-- Выберите --</option>
                                            {payers.map(p => (
                                              <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                          </select>
                                        </td>

                                        {/* Paid Checkbox */}
                                        <td className="sheet-cell text-center p-0">
                                          <input
                                            type="checkbox"
                                            checked={!!cr.paid}
                                            onChange={e => {
                                              const updatedRows = (order.contractors || []).map(r => r.id === cr.id ? { ...r, paid: e.target.checked } : r)
                                              onUpdateOrder({ ...order, contractors: updatedRows }, `Обновлена оплата подрядчика`)
                                            }}
                                            className="cursor-pointer accent-[#ffcc00]"
                                          />
                                        </td>

                                        {/* Reconciled Checkbox */}
                                        <td className="sheet-cell text-center p-0">
                                          <input
                                            type="checkbox"
                                            checked={!!cr.reconciled}
                                            onChange={e => {
                                              const updatedRows = (order.contractors || []).map(r => r.id === cr.id ? { ...r, reconciled: e.target.checked } : r)
                                              onUpdateOrder({ ...order, contractors: updatedRows }, `Обновлена сверка подрядчика`)
                                            }}
                                            className="cursor-pointer accent-[#ffcc00]"
                                          />
                                        </td>

                                        {/* Contractor Note Input (Syncs with Top Edit-Bar) */}
                                        <td className={`sheet-cell p-0 ${isCrActive('crNote') ? 'sheet-cell-active' : ''}`}>
                                          <input
                                            type="text"
                                            value={cr.note || ''}
                                            onFocus={() => {
                                              setActiveCell({ oid: order.id, field: 'crNote', contractorRowId: cr.id })
                                              setEditBar(cr.note || '')
                                            }}
                                            onChange={e => {
                                              const val = e.target.value
                                              setEditBar(val)
                                              const updatedRows = (order.contractors || []).map(r => r.id === cr.id ? { ...r, note: val } : r)
                                              onUpdateOrder({ ...order, contractors: updatedRows }, `Обновлено примечание подрядчика`)
                                            }}
                                            className="w-full h-full px-1 text-xs outline-none bg-transparent"
                                            placeholder="Примечание..."
                                          />
                                        </td>

                                        {/* Delete Action */}
                                        <td className="sheet-cell text-center">
                                          <button
                                            className="text-red-600 hover:text-red-800 text-xs font-bold cursor-pointer"
                                            onClick={() => {
                                              const updatedRows = (order.contractors || []).filter(r => r.id !== cr.id)
                                              onUpdateOrder({ ...order, contractors: updatedRows }, `Удален подрядчик из заказа #${order.id}`)
                                            }}
                                            title="Удалить подрядчика"
                                          >
                                            ✕
                                          </button>
                                        </td>
                                      </tr>
                                    )
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* AI Assistant Modal */}
      {isAiModalOpen && (
        <AiOrderModal
          isOpen={isAiModalOpen}
          clients={clients}
          contractors={contractors}
          payers={payers}
          onClose={() => setIsAiModalOpen(false)}
          onConfirmOrder={onConfirmAiOrder}
        />
      )}
    </div>
  )
}

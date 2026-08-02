import { Fragment, useState } from 'react'
import type { Order, Client, Contractor, Payer, OrderContractorRow } from '../types'
import { calcOrderTotals, evalFormula } from '../utils/formula'

interface OrdersTabProps {
  orders: Order[]
  clients: Client[]
  contractors: Contractor[]
  payers: Payer[]
  selectedMonth: string
  setSelectedMonth: (month: string) => void
  dateFrom: string
  setDateFrom: (date: string) => void
  dateTo: string
  setDateTo: (date: string) => void
  statusFilter: 'all' | 'active' | 'completed'
  setStatusFilter: (status: 'all' | 'active' | 'completed') => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  onAddOrder: () => void
  onCopyOrder: (order: Order) => void
  onDeleteOrder: (id: string) => void
  onUpdateOrder: (order: Order, logDesc?: string) => void
}

const EDITABLE_FIELDS = ['date', 'clientId', 'productName', 'saleAmount', 'paymentReceiverId', 'paymentNote', 'note']

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
  onUpdateOrder
}: OrdersTabProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [activeCell, setActiveCell] = useState<{ oid: string; field: string } | null>(null)
  const [editBar, setEditBar] = useState('')

  const isCashPayer = (payerId: string) => {
    const p = payers.find(x => x.id === payerId)
    return p?.type === 'cash'
  }

  // Filter logic
  const filteredOrders = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    
    if (dateFrom || dateTo) {
      if (dateFrom && o.date && o.date < dateFrom) return false
      if (dateTo && o.date && o.date > dateTo) return false
    } else if (selectedMonth && o.date && !o.date.startsWith(selectedMonth)) {
      return false
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const clientName = clients.find(c => c.id === o.clientId)?.name.toLowerCase() || ''
      const prod = (o.productName || '').toLowerCase()
      const note = (o.note || '').toLowerCase()
      return prod.includes(q) || clientName.includes(q) || note.includes(q) || o.id.includes(q)
    }
    return true
  })

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
      {/* 1C Command Panel / Filters */}
      <div className="bg-[#f0f2f5] border-b border-[#b8bdc5] px-3 py-2 flex flex-wrap items-center gap-3 shadow-2xs">
        {/* Month Selector */}
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-[#333740]">Месяц:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => {
              setSelectedMonth(e.target.value)
              setDateFrom('')
              setDateTo('')
            }}
            className="border border-[#b8bdc5] rounded px-1.5 py-0.5 text-xs outline-none bg-white text-[#1c1d1f]"
          />
        </div>

        {/* Date Range: From / To */}
        <div className="flex items-center gap-1 bg-[#e6e9ed] px-2 py-0.5 rounded border border-[#b8bdc5]">
          <span className="text-xs font-bold text-[#333740]">Дата с:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="border border-[#b8bdc5] rounded px-1 py-0.5 text-xs outline-none bg-white text-[#1c1d1f]"
          />
          <span className="text-xs font-bold text-[#333740]">по:</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="border border-[#b8bdc5] rounded px-1 py-0.5 text-xs outline-none bg-white text-[#1c1d1f]"
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

        {/* Search */}
        <input
          type="text"
          placeholder="Поиск..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="border border-[#b8bdc5] rounded px-2.5 py-0.5 text-xs outline-none w-44 bg-white text-[#1c1d1f] focus:border-[#ffcc00]"
        />

        <span className="text-xs text-[#555a64] font-medium ml-auto">Строк: {filteredOrders.length} (Навигация: ← → ↑ ↓)</span>

        <button
          className="bg-gradient-to-b from-[#ffdb4d] to-[#ffcc00] hover:from-[#ffcc00] hover:to-[#e6b800] text-[#1c1d1f] border border-[#d9a800] rounded px-4 py-1 text-xs font-bold cursor-pointer transition shadow-xs active:scale-95"
          onClick={onAddOrder}
        >
          + Создать заказ
        </button>
      </div>

      {/* 1C Quick Property Bar */}
      <div className="bg-white border-b border-[#b8bdc5] px-3 py-1.5 shadow-2xs border-l-4 border-l-[#ffcc00]">
        <div className="text-[10px] font-bold text-[#555a64] mb-0.5 uppercase tracking-wide">
          {activeCell ? `Редактирование: ${activeCell.field} (заказ #${activeCell.oid.slice(0, 6)})` : 'Строка ввода 1С — выберите ячейку (навигация стрелками ← → ↑ ↓)'}
        </div>
        <textarea
          className="w-full min-h-[34px] border border-[#b8bdc5] rounded p-1.5 text-xs outline-none resize-y focus:border-[#ffcc00] font-mono text-[#1c1d1f] bg-[#fffdf0]"
          value={editBar}
          onChange={e => {
            setEditBar(e.target.value)
            if (!activeCell) return
            const v = e.target.value
            const targetOrder = orders.find(o => o.id === activeCell.oid)
            if (!targetOrder) return

            let updated = { ...targetOrder }
            if (activeCell.field === 'productName') {
              updated.productName = v
            } else if (activeCell.field === 'saleAmount') {
              const s = v.trim()
              if (s.startsWith('=')) {
                updated.saleAmount = evalFormula(s)
                updated.saleFormula = s
              } else {
                updated.saleAmount = Number(s) || 0
                updated.saleFormula = ''
              }
            }
            onUpdateOrder(updated, `Правка поля ${activeCell.field} в заказе #${targetOrder.id}`)
          }}
          placeholder="Ввод текста или формулы (начинается с =)..."
        />
      </div>

      {/* 1C Sheet Table */}
      <div className="flex-1 overflow-auto bg-white border-b border-[#b8bdc5]">
        <table className="sheet-grid w-full">
          <thead>
            <tr>
              <th className="sheet-header" style={{ width: 45 }}>№</th>
              <th className="sheet-header" style={{ width: 95 }}>Дата</th>
              <th className="sheet-header" style={{ width: 160 }}>Контрагент (Клиент)</th>
              <th className="sheet-header" style={{ width: 220 }}>Номенклатура (Продукция)</th>
              <th className="sheet-header" style={{ width: 90 }}>Затраты</th>
              <th className="sheet-header" style={{ width: 110 }}>Сумма реал.</th>
              <th className="sheet-header" style={{ width: 85 }}>Прибыль</th>
              <th className="sheet-header" style={{ width: 60 }}>Рент%</th>
              <th className="sheet-header" style={{ width: 150 }}>Счет получателя</th>
              <th className="sheet-header" style={{ width: 75 }}>№ счета</th>
              <th className="sheet-header" style={{ width: 40 }}>Опл</th>
              <th className="sheet-header" style={{ width: 100 }}>Комментарий</th>
              <th className="sheet-header" style={{ width: 45 }}>Стат</th>
              <th className="sheet-header" style={{ width: 65 }}>Действ</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={14} className="text-center py-8 text-[#777d88] text-xs font-medium">
                  Нет документов в выбранном периоде. Нажмите <b>+ Создать заказ</b>.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order, idx) => {
                const t = calcOrderTotals(order)
                const isExp = !!expanded[order.id]
                const cash = isCashPayer(order.paymentReceiverId)

                const isCellActive = (field: string) => activeCell?.oid === order.id && activeCell?.field === field

                return (
                  <Fragment key={order.id}>
                    <tr className="sheet-row text-xs">
                      {/* NON-editable cell # */}
                      <td
                        className="sheet-cell text-center cursor-pointer select-none font-bold text-[#44474e] bg-[#f4f6f8]"
                        onClick={() => setExpanded(s => ({ ...s, [order.id]: !s[order.id] }))}
                        title="Раскрыть табличную часть подрядчиков"
                      >
                        {idx + 1} {isExp ? '▼' : '▶'}
                      </td>

                      {/* Editable Date */}
                      <td className={`sheet-cell p-0 ${isCellActive('date') ? 'sheet-cell-active' : ''}`}>
                        <input
                          id={`cell-${order.id}-date`}
                          type="date"
                          value={order.date || ''}
                          onFocus={() => setActiveCell({ oid: order.id, field: 'date' })}
                          onKeyDown={e => handleKeyDown(e, order.id, 'date')}
                          onChange={e => onUpdateOrder({ ...order, date: e.target.value }, `Изменение даты заказа #${order.id} на ${e.target.value}`)}
                          className="w-full h-full px-1 text-xs outline-none bg-transparent"
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
                          className="w-full h-full text-xs px-1 outline-none bg-transparent cursor-pointer font-medium"
                        >
                          <option value="">-- Выберите --</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Editable Product Name */}
                      <td
                        className={`sheet-cell cursor-pointer p-0 ${isCellActive('productName') ? 'sheet-cell-active' : ''}`}
                      >
                        <input
                          id={`cell-${order.id}-productName`}
                          type="text"
                          value={order.productName || ''}
                          onFocus={() => {
                            setActiveCell({ oid: order.id, field: 'productName' })
                            setEditBar(order.productName || '')
                          }}
                          onKeyDown={e => handleKeyDown(e, order.id, 'productName')}
                          onChange={e => onUpdateOrder({ ...order, productName: e.target.value }, `Изменение продукции заказа #${order.id}`)}
                          className="w-full h-full px-1 text-xs outline-none bg-transparent font-medium text-[#1c1d1f]"
                          placeholder="Продукция..."
                        />
                      </td>

                      {/* NON-editable Costs */}
                      <td className="sheet-cell text-right font-medium bg-[#f9fafb]">
                        <div className="cell-truncate text-[#9a3412]">{t.costs.toLocaleString('ru-RU')} ₽</div>
                      </td>

                      {/* Editable Sale Amount */}
                      <td
                        className={`sheet-cell cursor-pointer p-0 text-right font-bold ${isCellActive('saleAmount') ? 'sheet-cell-active' : ''}`}
                      >
                        <input
                          id={`cell-${order.id}-saleAmount`}
                          type="text"
                          defaultValue={order.saleFormula || order.saleAmount}
                          onFocus={() => {
                            setActiveCell({ oid: order.id, field: 'saleAmount' })
                            setEditBar(order.saleFormula || String(order.saleAmount))
                          }}
                          onKeyDown={e => handleKeyDown(e, order.id, 'saleAmount')}
                          onBlur={e => {
                            const val = e.target.value.trim()
                            let updated = { ...order }
                            if (val.startsWith('=')) {
                              updated.saleAmount = evalFormula(val)
                              updated.saleFormula = val
                            } else {
                              updated.saleAmount = Number(val) || 0
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
                            onFocus={() => setActiveCell({ oid: order.id, field: 'paymentNote' })}
                            onKeyDown={e => handleKeyDown(e, order.id, 'paymentNote')}
                            onChange={e => onUpdateOrder({ ...order, paymentNote: e.target.value }, `Изменение № счета заказа #${order.id}`)}
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
                          onFocus={() => setActiveCell({ oid: order.id, field: 'note' })}
                          onKeyDown={e => handleKeyDown(e, order.id, 'note')}
                          onChange={e => onUpdateOrder({ ...order, note: e.target.value }, `Изменение комментария заказа #${order.id}`)}
                          className="w-full h-full px-1 text-xs outline-none bg-transparent"
                          placeholder="Комментарий..."
                        />
                      </td>

                      {/* NON-editable Status */}
                      <td className="sheet-cell text-center">
                        <button
                          className="text-xs cursor-pointer px-1 font-bold"
                          onClick={() => onUpdateOrder({ ...order, status: order.status === 'completed' ? 'active' : 'completed' }, `Смена статуса заказа #${order.id}`)}
                          title="Нажмите для смены статуса 1С"
                        >
                          {order.status === 'completed' ? <span className="text-green-700">✓</span> : <span className="text-slate-400">○</span>}
                        </button>
                      </td>

                      {/* NON-editable Actions */}
                      <td className="sheet-cell text-center p-0">
                        <button
                          title="Копировать документ"
                          className="text-xs px-1 text-slate-700 hover:text-blue-700 font-bold cursor-pointer"
                          onClick={() => onCopyOrder(order)}
                        >
                          ⎘
                        </button>
                        <button
                          title="Пометить на удаление"
                          className="text-xs px-1 text-slate-700 hover:text-red-700 font-bold cursor-pointer ml-1"
                          onClick={() => onDeleteOrder(order.id)}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>

                    {/* 1C Contractor Tabular Section */}
                    {isExp && (
                      <tr>
                        <td colSpan={14} className="p-0 border-b border-[#b8bdc5]">
                          <div className="bg-[#fcfbe3] p-2 pl-6 border-l-4 border-l-[#ffcc00]">
                            <div className="flex items-center gap-3 mb-1.5">
                              <span className="text-xs font-extrabold text-[#333740]">
                                Табличная часть: Подрядчики и Менеджеры
                              </span>
                              <button
                                className="text-[11px] bg-gradient-to-b from-[#ffdb4d] to-[#ffcc00] border border-[#d9a800] text-[#1c1d1f] px-2.5 py-0.5 rounded font-bold cursor-pointer shadow-2xs hover:from-[#ffcc00]"
                                onClick={() => {
                                  const nr: OrderContractorRow = {
                                    id: Math.random().toString(36).slice(2, 6),
                                    contractorId: contractors[0]?.id || '',
                                    description: '',
                                    costFormula: '',
                                    costValue: 0,
                                    payerId: payers[0]?.id || '',
                                    paid: false,
                                    reconciled: false,
                                    note: ''
                                  }
                                  onUpdateOrder({ ...order, contractors: [...(order.contractors || []), nr] }, `Добавление подрядчика в заказ #${order.id}`)
                                }}
                              >
                                + Добавить строку
                              </button>
                            </div>

                            <table className="sheet-grid w-full bg-white border border-[#c9ced6] rounded">
                              <thead>
                                <tr className="bg-[#f0f2f5] text-[#333740] text-[11px] font-bold">
                                  <th className="sheet-header" style={{ width: 160 }}>Подрядчик</th>
                                  <th className="sheet-header">Содержание работ</th>
                                  <th className="sheet-header" style={{ width: 120 }}>Формула (=6*500)</th>
                                  <th className="sheet-header" style={{ width: 90 }}>= Сумма</th>
                                  <th className="sheet-header" style={{ width: 140 }}>Плательщик</th>
                                  <th className="sheet-header" style={{ width: 45 }}>Опл</th>
                                  <th className="sheet-header" style={{ width: 50 }}>Сверка</th>
                                  <th className="sheet-header" style={{ width: 120 }}>Примечание</th>
                                  <th className="sheet-header" style={{ width: 35 }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {(order.contractors || []).length === 0 ? (
                                  <tr>
                                    <td colSpan={9} className="text-center py-2 text-slate-400 text-[11px]">
                                      Строки не добавлены
                                    </td>
                                  </tr>
                                ) : (
                                  order.contractors.map((cr, cIdx) => (
                                    <tr key={cr.id} className="hover:bg-[#fff9d6] text-xs">
                                      <td className="sheet-cell p-0">
                                        <select
                                          value={cr.contractorId || ''}
                                          onChange={e => {
                                            const updatedCRs = order.contractors.map((c, i) => i === cIdx ? { ...c, contractorId: e.target.value } : c)
                                            onUpdateOrder({ ...order, contractors: updatedCRs }, `Изменение подрядчика в заказа #${order.id}`)
                                          }}
                                          className="w-full h-full text-xs px-1 outline-none bg-transparent cursor-pointer font-medium"
                                        >
                                          <option value="">-- Выберите --</option>
                                          {contractors.map(co => (
                                            <option key={co.id} value={co.id}>{co.name}</option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="sheet-cell p-0">
                                        <input
                                          type="text"
                                          value={cr.description || ''}
                                          onChange={e => {
                                            const updatedCRs = order.contractors.map((c, i) => i === cIdx ? { ...c, description: e.target.value } : c)
                                            onUpdateOrder({ ...order, contractors: updatedCRs }, `Изменение работ подрядчика в заказе #${order.id}`)
                                          }}
                                          className="w-full h-full px-1 text-xs outline-none bg-transparent"
                                          placeholder="Описание работ..."
                                        />
                                      </td>
                                      <td className="sheet-cell p-0">
                                        <input
                                          defaultValue={cr.costFormula || ''}
                                          onBlur={e => {
                                            const val = e.currentTarget.value
                                            const calcVal = evalFormula(val)
                                            const updatedCRs = order.contractors.map((c, i) => i === cIdx ? { ...c, costFormula: val, costValue: calcVal } : c)
                                            onUpdateOrder({ ...order, contractors: updatedCRs }, `Изменение формулы подрядчика в заказе #${order.id}`)
                                          }}
                                          className="w-full h-full px-1 text-xs outline-none bg-transparent font-mono"
                                          placeholder="=6*3*450"
                                        />
                                      </td>
                                      <td className="sheet-cell font-bold text-right bg-[#f4f6f8] text-[#9a3412]">
                                        {cr.costValue.toLocaleString('ru-RU')} ₽
                                      </td>
                                      <td className="sheet-cell p-0">
                                        <select
                                          value={cr.payerId || ''}
                                          onChange={e => {
                                            const updatedCRs = order.contractors.map((c, i) => i === cIdx ? { ...c, payerId: e.target.value } : c)
                                            onUpdateOrder({ ...order, contractors: updatedCRs }, `Изменение плательщика подрядчика в заказе #${order.id}`)
                                          }}
                                          className="w-full h-full text-xs px-1 outline-none bg-transparent cursor-pointer"
                                        >
                                          <option value="">-- Выберите --</option>
                                          {payers.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="sheet-cell text-center p-0">
                                        <input
                                          type="checkbox"
                                          checked={!!cr.paid}
                                          onChange={e => {
                                            const updatedCRs = order.contractors.map((c, i) => i === cIdx ? { ...c, paid: e.target.checked } : c)
                                            onUpdateOrder({ ...order, contractors: updatedCRs }, `Смена оплаты подрядчика в заказе #${order.id}`)
                                          }}
                                          className="accent-[#ffcc00]"
                                        />
                                      </td>
                                      <td className="sheet-cell text-center p-0">
                                        <input
                                          type="checkbox"
                                          checked={!!cr.reconciled}
                                          onChange={e => {
                                            const updatedCRs = order.contractors.map((c, i) => i === cIdx ? { ...c, reconciled: e.target.checked } : c)
                                            onUpdateOrder({ ...order, contractors: updatedCRs }, `Смена сверки подрядчика в заказе #${order.id}`)
                                          }}
                                          className="accent-[#ffcc00]"
                                        />
                                      </td>
                                      <td className="sheet-cell p-0">
                                        <input
                                          type="text"
                                          value={cr.note || ''}
                                          onChange={e => {
                                            const updatedCRs = order.contractors.map((c, i) => i === cIdx ? { ...c, note: e.target.value } : c)
                                            onUpdateOrder({ ...order, contractors: updatedCRs }, `Изменение примечания подрядчика в заказе #${order.id}`)
                                          }}
                                          className="w-full h-full px-1 text-xs outline-none bg-transparent"
                                          placeholder="Прим..."
                                        />
                                      </td>
                                      <td className="sheet-cell text-center p-0">
                                        <button
                                          className="text-xs text-red-600 hover:text-red-800 font-bold cursor-pointer"
                                          onClick={() => {
                                            const updatedCRs = order.contractors.filter((_, i) => i !== cIdx)
                                            onUpdateOrder({ ...order, contractors: updatedCRs }, `Удаление строки подрядчика из заказа #${order.id}`)
                                          }}
                                        >
                                          ✕
                                        </button>
                                      </td>
                                    </tr>
                                  ))
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
    </div>
  )
}

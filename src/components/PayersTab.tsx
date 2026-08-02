import { useState } from 'react'
import type { Payer } from '../types'

interface PayersTabProps {
  payers: Payer[]
  onAddPayer: () => void
  onUpdatePayer: (payer: Payer) => void
  onDeletePayer: (id: string) => void
}

export default function PayersTab({
  payers,
  onAddPayer,
  onUpdatePayer,
  onDeletePayer
}: PayersTabProps) {
  const [activeCell, setActiveCell] = useState<{ id: string; field: keyof Payer } | null>(null)
  const [editBar, setEditBar] = useState('')

  const handleCellFocus = (p: Payer, field: keyof Payer) => {
    setActiveCell({ id: p.id, field })
    setEditBar(String(p[field] || ''))
  }

  const handleEditBarChange = (val: string) => {
    setEditBar(val)
    if (!activeCell) return
    const target = payers.find(p => p.id === activeCell.id)
    if (!target) return
    onUpdatePayer({ ...target, [activeCell.field]: val })
  }

  return (
    <div className="flex-1 flex flex-col p-3 overflow-auto">
      {/* Header & Create Button */}
      <div className="flex justify-between items-center mb-2 bg-[#f0f2f5] p-2 border border-[#b8bdc5] rounded shadow-2xs">
        <div>
          <h2 className="text-xs font-bold text-[#1c1d1f] uppercase tracking-wide">
            Справочник: Плательщики и Банковские Счета ({payers.length})
          </h2>
          <p className="text-[11px] text-[#555a64]">
            Параметры счета определяют логику валидации поля № счета в 1С Заказах
          </p>
        </div>
        <button
          className="bg-gradient-to-b from-[#ffdb4d] to-[#ffcc00] hover:from-[#ffcc00] text-[#1c1d1f] border border-[#d9a800] rounded px-3 py-1 text-xs font-bold cursor-pointer transition shadow-2xs"
          onClick={onAddPayer}
        >
          + Создать элемент
        </button>
      </div>

      {/* 1C Quick Property Edit Bar */}
      <div className="bg-white border border-[#b8bdc5] rounded mb-2.5 p-2 shadow-2xs border-l-4 border-l-[#ffcc00]">
        <div className="text-[10px] font-bold text-[#555a64] mb-0.5 uppercase tracking-wide">
          {activeCell ? `Редактирование поля: ${String(activeCell.field)}` : 'Строка ввода 1С — выберите ячейку для редактирования наименования / типа счета'}
        </div>
        <textarea
          className="w-full min-h-[36px] border border-[#b8bdc5] rounded p-1.5 text-xs outline-none resize-y focus:border-[#ffcc00] font-mono text-[#1c1d1f] bg-[#fffdf0]"
          value={editBar}
          onChange={e => handleEditBarChange(e.target.value)}
          placeholder="Текст наименования счета..."
        />
      </div>

      {/* Sheet Table */}
      <div className="bg-white border border-[#b8bdc5] shadow-2xs overflow-hidden">
        <table className="sheet-grid w-full">
          <thead>
            <tr>
              <th className="sheet-header" style={{ width: 40 }}>№</th>
              <th className="sheet-header" style={{ width: 280 }}>Наименование / Название счета</th>
              <th className="sheet-header" style={{ width: 220 }}>Тип расчётного счета</th>
              <th className="sheet-header" style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {payers.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-6 text-slate-400 text-xs">
                  Справочник пуст
                </td>
              </tr>
            ) : (
              payers.map((p, idx) => {
                const isCellActive = (f: keyof Payer) => activeCell?.id === p.id && activeCell?.field === f
                return (
                  <tr key={p.id} className="hover:bg-[#fff9d6] text-xs border-b border-[#c9ced6]">
                    <td className="sheet-cell text-center text-slate-500 font-bold bg-[#f4f6f8]">{idx + 1}</td>
                    <td className={`sheet-cell p-0 ${isCellActive('name') ? 'sheet-cell-active' : ''}`}>
                      <input
                        type="text"
                        value={p.name}
                        onFocus={() => handleCellFocus(p, 'name')}
                        onChange={e => onUpdatePayer({ ...p, name: e.target.value })}
                        className="w-full h-full px-2 text-xs font-bold outline-none bg-transparent"
                      />
                    </td>
                    <td className={`sheet-cell p-0 ${isCellActive('type') ? 'sheet-cell-active' : ''}`}>
                      <select
                        value={p.type}
                        onFocus={() => handleCellFocus(p, 'type')}
                        onChange={e => onUpdatePayer({ ...p, type: e.target.value as any })}
                        className="w-full h-full text-xs px-2 outline-none bg-transparent cursor-pointer font-bold text-[#1c1d1f]"
                      >
                        <option value="cashless">Безналичный расчёт (требует № счета)</option>
                        <option value="cash">Наличные (№ счета заблокирован)</option>
                        <option value="card">Карта физлица</option>
                      </select>
                    </td>
                    <td className="sheet-cell text-center">
                      <button
                        className="text-red-600 hover:text-red-800 text-xs font-bold cursor-pointer"
                        onClick={() => onDeletePayer(p.id)}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

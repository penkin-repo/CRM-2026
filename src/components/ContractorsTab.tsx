import { useState } from 'react'
import type { Contractor } from '../types'

interface ContractorsTabProps {
  contractors: Contractor[]
  onAddContractor: () => void
  onUpdateContractor: (contractor: Contractor) => void
  onDeleteContractor: (id: string) => void
}

export default function ContractorsTab({
  contractors,
  onAddContractor,
  onUpdateContractor,
  onDeleteContractor
}: ContractorsTabProps) {
  const [activeCell, setActiveCell] = useState<{ id: string; field: keyof Contractor } | null>(null)
  const [editBar, setEditBar] = useState('')

  const handleCellFocus = (co: Contractor, field: keyof Contractor) => {
    setActiveCell({ id: co.id, field })
    setEditBar(String(co[field] || ''))
  }

  const handleEditBarChange = (val: string) => {
    setEditBar(val)
    if (!activeCell) return
    const target = contractors.find(co => co.id === activeCell.id)
    if (!target) return
    onUpdateContractor({ ...target, [activeCell.field]: val })
  }

  return (
    <div className="flex-1 flex flex-col p-3 overflow-auto">
      {/* Header & Create Button */}
      <div className="flex justify-between items-center mb-2 bg-[#f0f2f5] p-2 border border-[#b8bdc5] rounded shadow-2xs">
        <h2 className="text-xs font-bold text-[#1c1d1f] uppercase tracking-wide">
          Справочник: Подрядчики и Менеджеры ({contractors.length})
        </h2>
        <button
          className="bg-gradient-to-b from-[#ffdb4d] to-[#ffcc00] hover:from-[#ffcc00] text-[#1c1d1f] border border-[#d9a800] rounded px-3 py-1 text-xs font-bold cursor-pointer transition shadow-2xs"
          onClick={onAddContractor}
        >
          + Создать элемент
        </button>
      </div>

      {/* 1C Quick Property Edit Bar */}
      <div className="bg-white border border-[#b8bdc5] rounded mb-2.5 p-2 shadow-2xs border-l-4 border-l-[#ffcc00]">
        <div className="text-[10px] font-bold text-[#555a64] mb-0.5 uppercase tracking-wide">
          {activeCell ? `Редактирование поля: ${String(activeCell.field)}` : 'Строка ввода 1С — выберите ячейку для редактирования длинного текста / комментариев'}
        </div>
        <textarea
          className="w-full min-h-[36px] border border-[#b8bdc5] rounded p-1.5 text-xs outline-none resize-y focus:border-[#ffcc00] font-mono text-[#1c1d1f] bg-[#fffdf0]"
          value={editBar}
          onChange={e => handleEditBarChange(e.target.value)}
          placeholder="Текст ячейки (поддерживает многострочный ввод)..."
        />
      </div>

      {/* Sheet Table */}
      <div className="bg-white border border-[#b8bdc5] shadow-2xs overflow-hidden">
        <table className="sheet-grid w-full">
          <thead>
            <tr>
              <th className="sheet-header" style={{ width: 40 }}>№</th>
              <th className="sheet-header" style={{ width: 240 }}>ФИО / Название подрядчика</th>
              <th className="sheet-header" style={{ width: 160 }}>Телефон</th>
              <th className="sheet-header">Специализация / Комментарий</th>
              <th className="sheet-header" style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {contractors.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-400 text-xs">
                  Справочник пуст
                </td>
              </tr>
            ) : (
              contractors.map((co, idx) => {
                const isCellActive = (f: keyof Contractor) => activeCell?.id === co.id && activeCell?.field === f
                return (
                  <tr key={co.id} className="hover:bg-[#fff9d6] text-xs border-b border-[#c9ced6]">
                    <td className="sheet-cell text-center text-slate-500 font-bold bg-[#f4f6f8]">{idx + 1}</td>
                    <td className={`sheet-cell p-0 ${isCellActive('name') ? 'sheet-cell-active' : ''}`}>
                      <input
                        type="text"
                        value={co.name}
                        onFocus={() => handleCellFocus(co, 'name')}
                        onChange={e => onUpdateContractor({ ...co, name: e.target.value })}
                        className="w-full h-full px-2 text-xs font-bold outline-none bg-transparent"
                      />
                    </td>
                    <td className={`sheet-cell p-0 ${isCellActive('phone') ? 'sheet-cell-active' : ''}`}>
                      <input
                        type="text"
                        value={co.phone || ''}
                        onFocus={() => handleCellFocus(co, 'phone')}
                        onChange={e => onUpdateContractor({ ...co, phone: e.target.value })}
                        className="w-full h-full px-2 text-xs outline-none bg-transparent"
                      />
                    </td>
                    <td className={`sheet-cell p-0 ${isCellActive('note') ? 'sheet-cell-active' : ''}`}>
                      <input
                        type="text"
                        value={co.note || ''}
                        onFocus={() => handleCellFocus(co, 'note')}
                        onChange={e => onUpdateContractor({ ...co, note: e.target.value })}
                        className="w-full h-full px-2 text-xs outline-none bg-transparent"
                      />
                    </td>
                    <td className="sheet-cell text-center">
                      <button
                        className="text-red-600 hover:text-red-800 text-xs font-bold cursor-pointer"
                        onClick={() => onDeleteContractor(co.id)}
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

import { Trash2, Undo2, ChevronDown } from 'lucide-react'
import type { HistoryEntry } from '../types'

interface HistoryTabProps {
  history: HistoryEntry[]
  onClearHistory: () => void
  onRestoreSnapshot: (entry: HistoryEntry) => void
  onLoadMoreHistory?: (limit: number) => void
}

export default function HistoryTab({
  history,
  onClearHistory,
  onRestoreSnapshot,
  onLoadMoreHistory
}: HistoryTabProps) {
  return (
    <div className="flex-1 flex flex-col p-3 overflow-hidden">
      <div className="flex justify-between items-center mb-2 bg-[#f0f2f5] p-2 border border-[#b8bdc5] rounded shadow-2xs shrink-0">
        <div>
          <h2 className="text-xs font-bold text-[#1c1d1f] uppercase tracking-wide">
            Журнал регистрации и история снимков A29 CRM ({history.length})
          </h2>
          <p className="text-[11px] text-[#555a64]">
            Вы можете восстановить состояние базы данных на момент любой исторической записи
          </p>
        </div>
        <button
          className="text-xs bg-white border border-red-400 text-red-700 px-3 py-1 rounded font-bold hover:bg-red-50 cursor-pointer shadow-2xs flex items-center gap-1 shrink-0"
          onClick={onClearHistory}
        >
          <Trash2 className="w-3.5 h-3.5" /> Очистить журнал
        </button>
      </div>

      <div className="bg-white border border-[#b8bdc5] shadow-2xs flex-1 overflow-auto max-h-[calc(100vh-220px)] rounded-t">
        <table className="sheet-grid w-full">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="sheet-header" style={{ width: 150 }}>Дата и время</th>
              <th className="sheet-header" style={{ width: 170 }}>Событие</th>
              <th className="sheet-header">Детализация записи</th>
              <th className="sheet-header" style={{ width: 130 }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-6 text-slate-400 text-xs">
                  Журнал регистрации пуст
                </td>
              </tr>
            ) : (
              history.map(h => (
                <tr key={h.id} className="text-xs hover:bg-[#fff9d6] border-b border-[#c9ced6]">
                  <td className="sheet-cell text-slate-600 font-mono">{h.timestamp}</td>
                  <td className="sheet-cell font-bold text-[#1c1d1f]">{h.action}</td>
                  <td className="sheet-cell text-slate-700">{h.description}</td>
                  <td className="sheet-cell text-center p-0">
                    {h.snapshot ? (
                      <button
                        className="text-[11px] bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-400 rounded px-2 py-0.5 font-bold cursor-pointer transition shadow-2xs inline-flex items-center gap-1"
                        onClick={() => onRestoreSnapshot(h)}
                        title="Откатить состояние базы к этому снимку"
                      >
                        <Undo2 className="w-3 h-3" /> Восстановить
                      </button>
                    ) : (
                      <span className="text-slate-400 text-[10px]">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination / Load More Footer */}
      {onLoadMoreHistory && (
        <div className="bg-[#f0f2f5] border-x border-b border-[#b8bdc5] p-2 flex items-center justify-between gap-2 text-xs rounded-b shrink-0">
          <span className="text-slate-600 font-medium">Отображается записей: <b>{history.length}</b></span>
          <div className="flex items-center gap-1.5">
            <button
              className="bg-white hover:bg-slate-100 text-slate-700 border border-[#b8bdc5] px-2.5 py-1 rounded font-bold cursor-pointer shadow-2xs transition flex items-center gap-1"
              onClick={() => onLoadMoreHistory(100)}
            >
              <ChevronDown className="w-3.5 h-3.5" /> Загрузить 100
            </button>
            <button
              className="bg-white hover:bg-slate-100 text-slate-700 border border-[#b8bdc5] px-2.5 py-1 rounded font-bold cursor-pointer shadow-2xs transition flex items-center gap-1"
              onClick={() => onLoadMoreHistory(200)}
            >
              <ChevronDown className="w-3.5 h-3.5" /> Загрузить 200
            </button>
            <button
              className="bg-[#fff5a8] hover:bg-[#ffe866] text-slate-900 border border-[#e5ba00] px-2.5 py-1 rounded font-bold cursor-pointer shadow-2xs transition flex items-center gap-1"
              onClick={() => onLoadMoreHistory(500)}
            >
              <ChevronDown className="w-3.5 h-3.5" /> Всю историю (500)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

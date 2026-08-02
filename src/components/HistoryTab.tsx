import type { HistoryEntry } from '../types'

interface HistoryTabProps {
  history: HistoryEntry[]
  onClearHistory: () => void
  onRestoreSnapshot: (entry: HistoryEntry) => void
}

export default function HistoryTab({ history, onClearHistory, onRestoreSnapshot }: HistoryTabProps) {
  return (
    <div className="flex-1 flex flex-col p-3 overflow-auto">
      <div className="flex justify-between items-center mb-2 bg-[#f0f2f5] p-2 border border-[#b8bdc5] rounded shadow-2xs">
        <div>
          <h2 className="text-xs font-bold text-[#1c1d1f] uppercase tracking-wide">
            Журнал регистрации и история снимков 1С ({history.length})
          </h2>
          <p className="text-[11px] text-[#555a64]">
            Вы можете восстановить состояние базы данных на момент любой исторической записи
          </p>
        </div>
        <button
          className="text-xs bg-white border border-red-400 text-red-700 px-3 py-0.5 rounded font-bold hover:bg-red-50 cursor-pointer shadow-2xs"
          onClick={onClearHistory}
        >
          Очистить журнал
        </button>
      </div>

      <div className="bg-white border border-[#b8bdc5] shadow-2xs overflow-hidden">
        <table className="sheet-grid w-full">
          <thead>
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
                        className="text-[11px] bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-400 rounded px-2 py-0.5 font-bold cursor-pointer transition shadow-2xs"
                        onClick={() => onRestoreSnapshot(h)}
                        title="Откатить состояние базы к этому снимку"
                      >
                        ↩ Восстановить
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
    </div>
  )
}

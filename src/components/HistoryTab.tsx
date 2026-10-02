import { Trash2, Undo2, ChevronDown, RefreshCw, CheckCircle2, Clock, Cloud } from 'lucide-react'
import type { HistoryEntry } from '../types'

interface HistoryTabProps {
  history: HistoryEntry[]
  onClearHistory: () => void
  onRestoreSnapshot: (entry: HistoryEntry) => void
  onLoadMoreHistory?: (limit: number) => void
  isSyncing?: boolean
  onSyncHistory?: () => void
  lastSyncTime?: string
  unsyncedCount?: number
}

export default function HistoryTab({
  history,
  onClearHistory,
  onRestoreSnapshot,
  onLoadMoreHistory,
  isSyncing = false,
  onSyncHistory,
  lastSyncTime,
  unsyncedCount = 0
}: HistoryTabProps) {
  return (
    <div className="flex-1 flex flex-col p-3 overflow-hidden">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-2 bg-[#f0f2f5] p-2.5 border border-[#b8bdc5] rounded shadow-2xs shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xs font-bold text-[#1c1d1f] uppercase tracking-wide">
              Журнал регистрации и история снимков A29 CRM ({history.length} / 150)
            </h2>
            {/* Sync Status Badge */}
            {unsyncedCount === 0 ? (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300"
                title="Все исторические снимки сохранены в облачной базе Turso"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Облако: Синхронизировано
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300"
                title="Записи сохранены локально и будут отправлены в Turso по таймеру (каждые 5 мин) или вручную"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                В буфере: {unsyncedCount} {unsyncedCount === 1 ? 'шаг' : (unsyncedCount < 5 ? 'шага' : 'шагов')}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#555a64] mt-0.5 flex items-center gap-2 flex-wrap">
            <span>Откат базы данных на момент любой записи (локальный буфер до 150 шагов).</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">
              Авто-синхронизация: каждые 5 мин {lastSyncTime ? `(посл. в ${lastSyncTime})` : ''}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Manual Sync Button */}
          {onSyncHistory && (
            <button
              onClick={onSyncHistory}
              disabled={isSyncing || unsyncedCount === 0}
              className={`text-xs px-3 py-1.5 rounded font-bold cursor-pointer shadow-2xs flex items-center gap-1.5 transition border ${
                isSyncing
                  ? 'bg-blue-50 border-blue-300 text-blue-700 cursor-wait'
                  : unsyncedCount > 0
                  ? 'bg-amber-500 hover:bg-amber-600 border-amber-600 text-white animate-pulse'
                  : 'bg-white hover:bg-slate-100 border-[#b8bdc5] text-slate-600 opacity-80'
              }`}
              title="Отправить накопленный пакет истории в облако Turso прямо сейчас"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
              {isSyncing
                ? 'Синхронизация...'
                : unsyncedCount > 0
                ? `Отправить в Turso (${unsyncedCount})`
                : 'Синхронизировано'}
            </button>
          )}

          <button
            className="text-xs bg-white border border-red-400 text-red-700 px-3 py-1.5 rounded font-bold hover:bg-red-50 cursor-pointer shadow-2xs flex items-center gap-1 shrink-0"
            onClick={onClearHistory}
          >
            <Trash2 className="w-3.5 h-3.5" /> Очистить журнал
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#b8bdc5] shadow-2xs flex-1 overflow-auto max-h-[calc(100vh-220px)] rounded-t">
        <table className="sheet-grid w-full">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="sheet-header" style={{ width: 165 }}>Дата и время</th>
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
                  <td className="sheet-cell text-slate-600 font-mono">
                    <div className="flex items-center gap-1.5">
                      {h.synced === false ? (
                        <span
                          title="Сохранено в локальном буфере, ожидает отправки в Turso"
                          className="inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0"
                        />
                      ) : (
                        <span
                          title="Синхронизировано в облаке Turso"
                          className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                        />
                      )}
                      <span>{h.timestamp}</span>
                    </div>
                  </td>
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

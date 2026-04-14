import { RotateCcw, Trash2, Clock } from 'lucide-react';
// RotateCcw used below
import { HistoryEntry } from '../types';

interface Props {
  history: HistoryEntry[];
  onUndo: (entry: HistoryEntry) => void;
  onClear: () => void;
}

export function HistoryPage({ history, onUndo, onClear }: Props) {
  if (history.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <Clock size={48} className="mx-auto mb-4 text-gray-300" />
        <div className="text-lg">История изменений пуста</div>
        <div className="text-sm mt-2">Все изменения будут записываться здесь</div>
      </div>
    );
  }

  const actionIcons: Record<string, string> = {
    'create_order': '📋➕',
    'update_order': '📋✏️',
    'delete_order': '📋🗑️',
    'status_order': '📋✓',
    'duplicate_order': '📋📄',
    'create_client': '👤➕',
    'update_client': '👤✏️',
    'delete_client': '👤🗑️',
    'create_contractor': '🏗️➕',
    'update_contractor': '🏗️✏️',
    'delete_contractor': '🏗️🗑️',
    'create_payer': '💳➕',
    'update_payer': '💳✏️',
    'delete_payer': '💳🗑️',
    'update_report': '📊✏️',
    'import': '📥',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-700">История изменений ({history.length})</h3>
        <button onClick={onClear} className="text-sm text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 flex items-center gap-1.5">
          <Trash2 size={14} /> Очистить историю
        </button>
      </div>

      <div className="space-y-2">
        {history.map((entry, idx) => {
          const dt = new Date(entry.timestamp);
          const icon = actionIcons[entry.action] || '📝';
          return (
            <div key={entry.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <div className="text-2xl w-10 text-center flex-shrink-0">{icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 truncate">{entry.description}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {dt.toLocaleDateString('ru-RU')} в {dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {idx === 0 && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">Последнее</span>
                )}
                <button
                  onClick={() => {
                    if (confirm(`Восстановить состояние до действия "${entry.description}"?`)) {
                      onUndo(entry);
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 font-medium whitespace-nowrap"
                >
                  <RotateCcw size={13} className="inline mr-1" />Восстановить
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

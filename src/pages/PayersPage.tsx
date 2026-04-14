import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Payer } from '../types';
import { Modal } from '../components/Modal';
import { v4 as uuid } from 'uuid';

interface Props {
  payers: Payer[];
  setPayers: (p: Payer[], action?: string, desc?: string) => void;
}

export function PayersPage({ payers, setPayers }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Payer | null>(null);
  const [newName, setNewName] = useState('');

  function handleSave() {
    if (!newName.trim()) return;
    if (editItem) {
      setPayers(payers.map(p => p.id === editItem.id ? { ...p, name: newName.trim() } : p), 'update_payer', `Изменён плательщик: ${newName.trim()}`);
    } else {
      setPayers([...payers, { id: uuid(), name: newName.trim(), createdAt: new Date().toISOString() }], 'create_payer', `Создан плательщик: ${newName.trim()}`);
    }
    setShowCreate(false);
    setEditItem(null);
    setNewName('');
  }

  function handleDelete(id: string) {
    const item = payers.find(p => p.id === id);
    if (confirm('Удалить?')) setPayers(payers.filter(p => p.id !== id), 'delete_payer', `Удалён плательщик: ${item?.name || id}`);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-700">Список плательщиков</h3>
        <button onClick={() => { setNewName(''); setShowCreate(true); }} className="bg-purple-600 text-white px-4 py-2.5 rounded-lg hover:bg-purple-700 font-medium text-sm flex items-center gap-2">
          <Plus size={16} /> Добавить
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Название</th>
              <th className="px-4 py-3 w-32"></th>
            </tr>
          </thead>
          <tbody>
            {payers.map(p => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditItem(p); setNewName(p.name); setShowCreate(true); }} className="text-gray-400 hover:text-yellow-600 transition-colors" title="Редактировать"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-600 transition-colors" title="Удалить"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {payers.length === 0 && (
              <tr><td colSpan={2} className="text-center py-10 text-gray-400">Нет плательщиков</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); setEditItem(null); }} title={editItem ? 'Редактировать' : 'Новый плательщик'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 font-medium text-sm">Сохранить</button>
            <button onClick={() => { setShowCreate(false); setEditItem(null); }} className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-300 font-medium text-sm">Отмена</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

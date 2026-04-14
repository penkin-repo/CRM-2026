import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Contractor } from '../types';
import { Modal } from '../components/Modal';
import { v4 as uuid } from 'uuid';

interface Props {
  contractors: Contractor[];
  setContractors: (c: Contractor[], action?: string, desc?: string) => void;
}

export function ContractorsPage({ contractors, setContractors }: Props) {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Contractor | null>(null);

  const filtered = contractors.filter(c => {
    const q = search.toLowerCase();
    if (!q) return true;
    return [c.name, c.phone, c.note].join(' ').toLowerCase().includes(q);
  });

  function handleSave(c: Contractor) {
    if (editItem) {
      setContractors(contractors.map(x => x.id === c.id ? c : x), 'update_contractor', `Изменён подрядчик: ${c.name}`);
    } else {
      setContractors([...contractors, c], 'create_contractor', `Создан подрядчик: ${c.name}`);
    }
    setShowCreate(false);
    setEditItem(null);
  }

  function handleDelete(id: string) {
    const item = contractors.find(c => c.id === id);
    if (confirm('Удалить подрядчика?')) {
      setContractors(contractors.filter(c => c.id !== id), 'delete_contractor', `Удалён подрядчик: ${item?.name || id}`);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по подрядчикам..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={() => setShowCreate(true)} className="bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 font-medium text-sm whitespace-nowrap flex items-center gap-2">
          <Plus size={16} /> Добавить подрядчика
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Название</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Телефон</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Примечание</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{c.note || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => setEditItem(c)} className="text-gray-400 hover:text-yellow-600 transition-colors" title="Редактировать"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-600 transition-colors" title="Удалить"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">Подрядчики не найдены</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showCreate || !!editItem} onClose={() => { setShowCreate(false); setEditItem(null); }} title={editItem ? 'Редактировать подрядчика' : 'Новый подрядчик'}>
        <ContractorForm initial={editItem || undefined} onSave={handleSave} onCancel={() => { setShowCreate(false); setEditItem(null); }} />
      </Modal>
    </div>
  );
}

function ContractorForm({ initial, onSave, onCancel }: { initial?: Contractor; onSave: (c: Contractor) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [note, setNote] = useState(initial?.note || '');

  function handleSubmit() {
    if (!name.trim()) { alert('Введите название'); return; }
    onSave({
      id: initial?.id || uuid(),
      name: name.trim(),
      phone, note,
      createdAt: initial?.createdAt || new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
        <input value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
        <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Примечание</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={handleSubmit} className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 font-medium text-sm">Сохранить</button>
        <button onClick={onCancel} className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-300 font-medium text-sm">Отмена</button>
      </div>
    </div>
  );
}

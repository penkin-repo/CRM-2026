import { useState, useMemo } from 'react';
import { Client, Order, Contractor, Payer } from '../types';
import { Modal } from '../components/Modal';
import { v4 as uuid } from 'uuid';

interface Props {
  clients: Client[];
  setClients: (c: Client[], action?: string, desc?: string) => void;
  orders: Order[];
  setOrders: (o: Order[], action?: string, desc?: string) => void;
  contractors: Contractor[];
  payers: Payer[];
}

export function ClientsPage({ clients, setClients, orders, setOrders, contractors, payers }: Props) {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  const contractorMap = useMemo(() => Object.fromEntries(contractors.map(c => [c.id, c])), [contractors]);
  const payerMap = useMemo(() => Object.fromEntries(payers.map(p => [p.id, p])), [payers]);
  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    if (!q) return true;
    const all = [c.name, c.phone, c.contactPerson, c.email, c.note, ...c.customFields.map(f => f.label + ' ' + f.value)].join(' ').toLowerCase();
    return all.includes(q);
  });

  const clientOrders = useMemo(() => {
    if (!viewClient) return [];
    return orders.filter(o => o.clientId === viewClient.id).sort((a, b) => b.date.localeCompare(a.date));
  }, [orders, viewClient]);

  function handleSaveNew(c: Client) {
    setClients([...clients, c], 'create_client', `Создан клиент: ${c.name}`);
    setShowCreate(false);
  }

  function handleUpdate(c: Client) {
    setClients(clients.map(x => x.id === c.id ? c : x), 'update_client', `Изменён клиент: ${c.name}`);
    setEditClient(null);
    setViewClient(c);
  }

  function handleDelete(id: string) {
    const cl = clients.find(c => c.id === id);
    if (confirm('Удалить клиента?')) {
      setClients(clients.filter(c => c.id !== id), 'delete_client', `Удалён клиент: ${cl?.name || id}`);
      setViewClient(null);
    }
  }

  function getProfit(o: Order) {
    return o.saleAmount - o.contractors.reduce((s, c) => s + c.costValue, 0);
  }

  function duplicateOrder(o: Order) {
    const newOrder: Order = {
      ...JSON.parse(JSON.stringify(o)),
      id: uuid(),
      date: new Date().toISOString().slice(0, 10),
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      contractors: o.contractors.map(c => ({ ...c, id: uuid(), paid: false, reconciled: false })),
    };
    setOrders([...orders, newOrder], 'duplicate_order', `Дублирован заказ: ${o.productName}`);
    setViewOrder(null);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по клиентам (имя, телефон, email, примечание)..."
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm whitespace-nowrap">
          + Добавить клиента
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map(c => (
          <div
            key={c.id}
            onClick={() => { setViewClient(c); setExpanded(false); setShowOrders(false); }}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all"
          >
            <div className="font-semibold text-gray-800 truncate">{c.name}</div>
            {c.phone && <div className="text-sm text-gray-500 mt-1">📞 {c.phone}</div>}
            {c.contactPerson && <div className="text-xs text-gray-400 mt-0.5">👤 {c.contactPerson}</div>}
            <div className="text-xs text-gray-400 mt-1">
              Заказов: {orders.filter(o => o.clientId === c.id).length}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center py-10 text-gray-400">Клиенты не найдены</div>}
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Новый клиент">
        <ClientForm onSave={handleSaveNew} onCancel={() => setShowCreate(false)} />
      </Modal>

      {/* View modal */}
      <Modal open={!!viewClient && !editClient} onClose={() => setViewClient(null)} title={viewClient?.name || ''}>
        {viewClient && (
          <div>
            <div className="mb-4 font-bold text-lg text-gray-800">{viewClient.name}</div>
            <button onClick={() => setExpanded(!expanded)} className="text-blue-600 hover:underline text-sm mb-3 block">
              {expanded ? 'Скрыть подробности ▲' : 'Показать подробности ▼'}
            </button>
            {expanded && (
              <div className="space-y-2 text-sm mb-4 bg-gray-50 rounded-lg p-4">
                <div><span className="font-medium text-gray-600">Телефон:</span> {viewClient.phone || '—'}</div>
                <div><span className="font-medium text-gray-600">Контактное лицо:</span> {viewClient.contactPerson || '—'}</div>
                <div><span className="font-medium text-gray-600">Email:</span> {viewClient.email || '—'}</div>
                <div><span className="font-medium text-gray-600">Примечание:</span> {viewClient.note || '—'}</div>
                {viewClient.customFields.map((f, i) => (
                  <div key={i}><span className="font-medium text-gray-600">{f.label}:</span> {f.value}</div>
                ))}
              </div>
            )}

            {/* Orders section */}
            <button onClick={() => setShowOrders(!showOrders)} className="text-blue-600 hover:underline text-sm mb-3 block">
              {showOrders ? `Скрыть заказы (${clientOrders.length}) ▲` : `Показать заказы (${clientOrders.length}) ▼`}
            </button>
            {showOrders && (
              <div className="mb-4">
                {clientOrders.length === 0 ? (
                  <div className="text-sm text-gray-400 py-4 text-center">Нет заказов</div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {clientOrders.map(o => {
                      const profit = getProfit(o);
                      return (
                        <div key={o.id} className="bg-gray-50 rounded-lg p-3 text-sm hover:bg-blue-50 cursor-pointer border border-gray-200" onClick={() => setViewOrder(o)}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-gray-800">{o.productName}</div>
                              <div className="text-xs text-gray-500">{new Date(o.date).toLocaleDateString('ru-RU')}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono">{o.saleAmount.toLocaleString('ru-RU')} ₽</div>
                              <div className={`text-xs ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                Прибыль: {profit.toLocaleString('ru-RU')} ₽
                              </div>
                            </div>
                          </div>
                          <div className="mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${o.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {o.status === 'completed' ? 'Выполнен' : 'Активный'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={() => { setEditClient(viewClient); }} className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-600">Редактировать</button>
              <button onClick={() => handleDelete(viewClient.id)} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600">Удалить</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editClient} onClose={() => setEditClient(null)} title="Редактировать клиента">
        {editClient && <ClientForm initial={editClient} onSave={handleUpdate} onCancel={() => setEditClient(null)} />}
      </Modal>

      {/* View order detail modal */}
      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title="Детали заказа" wide>
        {viewOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium text-gray-500">Дата:</span> {new Date(viewOrder.date).toLocaleDateString('ru-RU')}</div>
              <div><span className="font-medium text-gray-500">Статус:</span> {viewOrder.status === 'completed' ? '✅ Выполнен' : '🔵 Активный'}</div>
              <div><span className="font-medium text-gray-500">Клиент:</span> {clientMap[viewOrder.clientId]?.name || '—'}</div>
              <div><span className="font-medium text-gray-500">Продукция:</span> {viewOrder.productName}</div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Подрядчики:</h4>
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="px-3 py-2 text-left">Подрядчик</th>
                      <th className="px-3 py-2 text-left">Описание</th>
                      <th className="px-3 py-2 text-right">Стоимость</th>
                      <th className="px-3 py-2 text-left">Плательщик</th>
                      <th className="px-3 py-2 text-center">Опл</th>
                      <th className="px-3 py-2 text-center">Свер</th>
                      <th className="px-3 py-2 text-left">Прим.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewOrder.contractors.map(c => (
                      <tr key={c.id} className="border-t border-gray-100">
                        <td className="px-3 py-2">{contractorMap[c.contractorId]?.name || '—'}</td>
                        <td className="px-3 py-2">{c.description}</td>
                        <td className="px-3 py-2 text-right font-mono">{c.costValue.toLocaleString('ru-RU')} ₽</td>
                        <td className="px-3 py-2">{payerMap[c.payerId]?.name || '—'}</td>
                        <td className="px-3 py-2 text-center">{c.paid ? '✅' : '❌'}</td>
                        <td className="px-3 py-2 text-center">{c.reconciled ? '✅' : '❌'}</td>
                        <td className="px-3 py-2 text-gray-500">{c.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Реализация</div>
                <div className="font-bold">{viewOrder.saleAmount.toLocaleString('ru-RU')} ₽</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Себестоимость</div>
                <div className="font-bold">{viewOrder.contractors.reduce((s, c) => s + c.costValue, 0).toLocaleString('ru-RU')} ₽</div>
              </div>
              <div className={`rounded-lg p-3 ${getProfit(viewOrder) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="text-xs text-gray-500">Прибыль</div>
                <div className={`font-bold ${getProfit(viewOrder) >= 0 ? 'text-green-700' : 'text-red-700'}`}>{getProfit(viewOrder).toLocaleString('ru-RU')} ₽</div>
              </div>
            </div>
            {viewOrder.note && <div className="text-sm"><span className="font-medium text-gray-500">Примечание:</span> {viewOrder.note}</div>}
            <div className="flex gap-2 pt-2">
              <button onClick={() => duplicateOrder(viewOrder)} className="bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-600">📄 Дублировать заказ</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ClientForm({ initial, onSave, onCancel }: { initial?: Client; onSave: (c: Client) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [contactPerson, setContactPerson] = useState(initial?.contactPerson || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [note, setNote] = useState(initial?.note || '');
  const [customFields, setCustomFields] = useState<{ label: string; value: string }[]>(initial?.customFields || []);

  function handleSubmit() {
    if (!name.trim()) { alert('Введите название'); return; }
    onSave({
      id: initial?.id || uuid(),
      name: name.trim(),
      phone, contactPerson, email, note,
      customFields,
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Контактное лицо</label>
        <input value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Эл. почта</label>
        <input value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Примечание</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Дополнительные поля</label>
          <button type="button" onClick={() => setCustomFields([...customFields, { label: '', value: '' }])} className="text-blue-600 text-sm hover:underline">+ Добавить поле</button>
        </div>
        {customFields.map((f, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input value={f.label} onChange={e => { const nf = [...customFields]; nf[i] = { ...nf[i], label: e.target.value }; setCustomFields(nf); }} placeholder="Название поля" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input value={f.value} onChange={e => { const nf = [...customFields]; nf[i] = { ...nf[i], value: e.target.value }; setCustomFields(nf); }} placeholder="Значение" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="button" onClick={() => setCustomFields(customFields.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 px-2">✕</button>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={handleSubmit} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm">Сохранить</button>
        <button onClick={onCancel} className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-300 font-medium text-sm">Отмена</button>
      </div>
    </div>
  );
}

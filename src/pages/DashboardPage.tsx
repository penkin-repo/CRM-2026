import { useState, useMemo } from 'react';
import {
  Eye, Pencil, Copy, Trash2, Plus, ArrowUpDown, ArrowUp, ArrowDown,
  CheckCircle2, Circle, BadgeDollarSign, AlertTriangle, RefreshCcw,
  TrendingUp, ShoppingCart, Wallet, PackageCheck, Ban
} from 'lucide-react';
import { Order, Client, Contractor, Payer, DashboardFilters } from '../types';
import { Modal } from '../components/Modal';
import { OrderForm } from '../components/OrderForm';
import { v4 as uuid } from 'uuid';

interface Props {
  orders: Order[];
  setOrders: (o: Order[], action?: string, desc?: string) => void;
  clients: Client[];
  contractors: Contractor[];
  payers: Payer[];
  filters: DashboardFilters;
  setFilters: (f: DashboardFilters) => void;
}

function Tip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex items-center">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-md bg-gray-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
        {text}
      </span>
    </span>
  );
}

export function DashboardPage({ orders, setOrders, clients, contractors, payers, filters, setFilters }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);
  const contractorMap = useMemo(() => Object.fromEntries(contractors.map(c => [c.id, c])), [contractors]);
  const payerMap = useMemo(() => Object.fromEntries(payers.map(p => [p.id, p])), [payers]);

  const filtered = useMemo(() => {
    let result = [...orders];
    if (filters.status === 'active') result = result.filter(o => o.status === 'active');
    else if (filters.status === 'completed') result = result.filter(o => o.status === 'completed');
    if (filters.dateFrom) result = result.filter(o => o.date >= filters.dateFrom);
    if (filters.dateTo) result = result.filter(o => o.date <= filters.dateTo);
    if (filters.month) result = result.filter(o => o.date.slice(0, 7) === filters.month);
    if (filters.searchText) {
      const q = filters.searchText.toLowerCase();
      result = result.filter(o => {
        const clientName = clientMap[o.clientId]?.name || '';
        const contractorNames = o.contractors.map(c => contractorMap[c.contractorId]?.name || '').join(' ');
        const descriptions = o.contractors.map(c => c.description + ' ' + c.note).join(' ');
        const all = [o.productName, clientName, contractorNames, descriptions, o.note, o.date, o.paymentNote || ''].join(' ').toLowerCase();
        return all.includes(q);
      });
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (filters.sortBy === 'date') cmp = a.date.localeCompare(b.date);
      else if (filters.sortBy === 'client') cmp = (clientMap[a.clientId]?.name || '').localeCompare(clientMap[b.clientId]?.name || '');
      else if (filters.sortBy === 'amount') cmp = a.saleAmount - b.saleAmount;
      return filters.sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [orders, filters, clientMap, contractorMap]);

  function getProfit(o: Order) { return o.saleAmount - o.contractors.reduce((s, c) => s + c.costValue, 0); }
  function getMargin(o: Order) { const p = getProfit(o); return o.saleAmount > 0 ? (p / o.saleAmount * 100) : 0; }

  function handleSaveOrder(o: Order) {
    if (editOrder) setOrders(orders.map(x => x.id === o.id ? o : x), 'update_order', `Изменён заказ: ${o.productName}`);
    else setOrders([...orders, o], 'create_order', `Создан заказ: ${o.productName}`);
    setShowCreate(false); setEditOrder(null);
  }

  function handleDelete(id: string) {
    const order = orders.find(o => o.id === id);
    if (confirm('Удалить заказ?')) {
      setOrders(orders.filter(o => o.id !== id), 'delete_order', `Удалён: ${order?.productName || id}`);
      setViewOrder(null);
    }
  }

  function toggleStatus(o: Order) {
    const newStatus = o.status === 'active' ? 'completed' as const : 'active' as const;
    setOrders(orders.map(x => x.id === o.id ? { ...o, status: newStatus } : x), 'status_order', `Статус: ${newStatus}`);
  }

  function togglePaymentReceived(o: Order) {
    const updated = { ...o, paymentReceived: !o.paymentReceived };
    setOrders(orders.map(x => x.id === o.id ? updated : x), 'payment_order', `Оплата: ${updated.paymentReceived ? 'получена' : 'не получена'}`);
  }

  function duplicateOrder(o: Order) {
    const newOrder: Order = {
      ...JSON.parse(JSON.stringify(o)),
      id: uuid(), date: new Date().toISOString().slice(0, 10),
      status: 'active' as const, paymentReceived: false,
      createdAt: new Date().toISOString(),
      contractors: o.contractors.map(c => ({ ...c, id: uuid(), paid: false, reconciled: false })),
    };
    setOrders([...orders, newOrder], 'duplicate_order', `Дублирован: ${o.productName}`);
    setViewOrder(null);
  }

  function updateFilter<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) {
    setFilters({ ...filters, [key]: value });
  }

  const totalRevenue = filtered.reduce((s, o) => s + o.saleAmount, 0);
  const totalProfit = filtered.reduce((s, o) => s + getProfit(o), 0);
  const activeCount = filtered.filter(o => o.status === 'active').length;
  const unpaidCount = filtered.filter(o => !o.paymentReceived).length;
  const missingPayer = filtered.filter(o => o.contractors.some(c => !c.payerId && c.costValue > 0));
  const unreconciledCount = filtered.reduce((s, o) => s + o.contractors.filter(c => !c.reconciled && c.costValue > 0).length, 0);
  const unpaidContractors = filtered.reduce((s, o) => s + o.contractors.filter(c => !c.paid && c.costValue > 0).length, 0);

  const SortIcon = filters.sortDir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-blue-100 rounded-lg p-2"><ShoppingCart size={18} className="text-blue-600" /></div>
          <div><div className="text-xs text-gray-500">Заказов</div><div className="text-2xl font-bold text-gray-800">{filtered.length}</div></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-indigo-100 rounded-lg p-2"><Circle size={18} className="text-indigo-600" /></div>
          <div><div className="text-xs text-gray-500">Активных</div><div className="text-2xl font-bold text-indigo-600">{activeCount}</div></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="bg-gray-100 rounded-lg p-2"><Wallet size={18} className="text-gray-600" /></div>
          <div><div className="text-xs text-gray-500">Реализация</div><div className="text-lg font-bold text-gray-800">{totalRevenue.toLocaleString('ru-RU')} ₽</div></div>
        </div>
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${totalProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className={`rounded-lg p-2 ${totalProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}><TrendingUp size={18} className={totalProfit >= 0 ? 'text-green-600' : 'text-red-600'} /></div>
          <div><div className="text-xs text-gray-500">Прибыль</div><div className={`text-lg font-bold ${totalProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{totalProfit.toLocaleString('ru-RU')} ₽</div></div>
        </div>
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${unpaidCount > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
          <div className={`rounded-lg p-2 ${unpaidCount > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
            <BadgeDollarSign size={18} className={unpaidCount > 0 ? 'text-yellow-600' : 'text-green-600'} />
          </div>
          <div>
            <div className="text-xs text-gray-500">Без оплаты от клиентов</div>
            <div className={`text-2xl font-bold ${unpaidCount > 0 ? 'text-yellow-700' : 'text-green-700'}`}>{unpaidCount}</div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {(missingPayer.length > 0 || unreconciledCount > 0 || unpaidContractors > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          {missingPayer.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle size={13} /> <strong>{missingPayer.length}</strong> заказ(ов) с подрядчиками без плательщика
            </div>
          )}
          {unreconciledCount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700 flex items-center gap-2">
              <RefreshCcw size={13} /> <strong>{unreconciledCount}</strong> позиций не сверены
            </div>
          )}
          {unpaidContractors > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-700 flex items-center gap-2">
              <Ban size={13} /> <strong>{unpaidContractors}</strong> позиций подрядчиков не оплачены
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Статус</label>
            <select value={filters.status} onChange={e => updateFilter('status', e.target.value as DashboardFilters['status'])}
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">Все</option>
              <option value="active">Активные</option>
              <option value="completed">Выполнены</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Дата от</label>
            <input type="date" value={filters.dateFrom} onChange={e => updateFilter('dateFrom', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Дата до</label>
            <input type="date" value={filters.dateTo} onChange={e => updateFilter('dateTo', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Месяц</label>
            <input type="month" value={filters.month} onChange={e => updateFilter('month', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Поиск по тексту</label>
            <input value={filters.searchText} onChange={e => updateFilter('searchText', e.target.value)}
              placeholder="Поиск..." className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Сортировка</label>
            <div className="flex gap-1">
              <select value={filters.sortBy} onChange={e => updateFilter('sortBy', e.target.value as DashboardFilters['sortBy'])}
                className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="date">Дата</option>
                <option value="client">Клиент</option>
                <option value="amount">Сумма</option>
              </select>
              <button onClick={() => updateFilter('sortDir', filters.sortDir === 'asc' ? 'desc' : 'asc')}
                className="border border-gray-300 rounded-lg px-2 py-2 text-sm hover:bg-gray-100" title="Направление">
                <SortIcon size={14} />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={() => setFilters({ status: 'active', dateFrom: '', dateTo: '', month: '', searchText: '', sortBy: 'date', sortDir: 'desc' })}
            className="text-sm text-gray-400 hover:text-gray-700 underline">Сбросить фильтры</button>
        </div>
      </div>

      {/* Title + Create */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Заказы ({filtered.length})</h3>
        <button onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2">
          <Plus size={16} /> Новый заказ
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-3 font-semibold text-gray-600 w-10">
                <Tip text="Статус выполнения (чекбокс)"><ArrowUpDown size={14} /></Tip>
              </th>
              <th className="text-left px-3 py-3 font-semibold text-gray-600 w-24">Дата</th>
              <th className="text-left px-3 py-3 font-semibold text-gray-600">Клиент</th>
              <th className="text-left px-3 py-3 font-semibold text-gray-600">Продукция</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-600">Реализация</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-600">
                <Tip text="Прибыль = Реализация − Затраты подрядчиков"><span>Прибыль</span></Tip>
              </th>
              <th className="text-right px-3 py-3 font-semibold text-gray-600">
                <Tip text="Рентабельность = Прибыль / Реализация × 100%"><span>%</span></Tip>
              </th>
              <th className="text-center px-3 py-3 font-semibold text-gray-600 w-16">
                <Tip text="Оплата от клиента получена"><BadgeDollarSign size={15} /></Tip>
              </th>
              <th className="text-center px-3 py-3 font-semibold text-gray-600 w-20">
                <Tip text="Статус заказа: Активный / Выполнен"><PackageCheck size={15} /></Tip>
              </th>
              <th className="px-3 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => {
              const profit = getProfit(o);
              const margin = getMargin(o);
              const hasMissingPayer = o.contractors.some(c => !c.payerId && c.costValue > 0);
              const hasUnreconciled = o.contractors.some(c => !c.reconciled && c.costValue > 0);
              return (
                <tr key={o.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors
                    ${o.status === 'completed' ? 'bg-green-50/30' : ''}
                    ${hasMissingPayer ? 'border-l-4 border-l-red-400' : hasUnreconciled ? 'border-l-4 border-l-orange-300' : ''}`}>
                  <td className="px-3 py-3">
                    <Tip text={o.status === 'completed' ? 'Выполнен — нажмите для отмены' : 'Активный — нажмите чтобы закрыть'}>
                      <button onClick={() => toggleStatus(o)} className="text-gray-400 hover:text-blue-600 transition-colors">
                        {o.status === 'completed'
                          ? <CheckCircle2 size={18} className="text-green-500" />
                          : <Circle size={18} className="text-gray-300" />}
                      </button>
                    </Tip>
                  </td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{new Date(o.date).toLocaleDateString('ru-RU')}</td>
                  <td className="px-3 py-3 font-medium cursor-pointer hover:text-blue-600" onClick={() => setViewOrder(o)}>
                    {clientMap[o.clientId]?.name || '—'}
                  </td>
                  <td className="px-3 py-3 cursor-pointer hover:text-blue-600" onClick={() => setViewOrder(o)}>
                    {o.productName}
                    {hasMissingPayer && (
                      <Tip text="Есть подрядчик без плательщика">
                        <AlertTriangle size={13} className="inline ml-1 text-red-500" />
                      </Tip>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">{o.saleAmount.toLocaleString('ru-RU')}</td>
                  <td className={`px-3 py-3 text-right font-mono font-medium ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {profit.toLocaleString('ru-RU')}
                  </td>
                  <td className={`px-3 py-3 text-right text-xs ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {margin.toFixed(1)}%
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Tip text={o.paymentReceived ? 'Оплата от клиента получена — нажмите для изменения' : 'Оплата от клиента не получена — нажмите для подтверждения'}>
                      <button onClick={() => togglePaymentReceived(o)}
                        className={`rounded-full p-1 transition-colors ${o.paymentReceived ? 'text-green-500 hover:bg-green-50' : 'text-red-400 hover:bg-red-50'}`}>
                        {o.paymentReceived ? <CheckCircle2 size={18} /> : <Ban size={18} />}
                      </button>
                    </Tip>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${o.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {o.status === 'completed' ? 'Готов' : 'Актив'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1.5 items-center">
                      <Tip text="Просмотр заказа">
                        <button onClick={() => setViewOrder(o)} className="text-gray-400 hover:text-blue-600 transition-colors"><Eye size={15} /></button>
                      </Tip>
                      <Tip text="Редактировать">
                        <button onClick={() => setEditOrder(o)} className="text-gray-400 hover:text-yellow-600 transition-colors"><Pencil size={15} /></button>
                      </Tip>
                      <Tip text="Дублировать заказ">
                        <button onClick={() => duplicateOrder(o)} className="text-gray-400 hover:text-indigo-600 transition-colors"><Copy size={15} /></button>
                      </Tip>
                      <Tip text="Удалить заказ">
                        <button onClick={() => handleDelete(o.id)} className="text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={15} /></button>
                      </Tip>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">Заказы не найдены</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit modal */}
      <Modal open={showCreate || !!editOrder} onClose={() => { setShowCreate(false); setEditOrder(null); }}
        title={editOrder ? 'Редактировать заказ' : 'Новый заказ'} wide>
        <OrderForm
          initial={editOrder || undefined}
          clients={clients} contractors={contractors} payers={payers}
          onSave={handleSaveOrder}
          onCancel={() => { setShowCreate(false); setEditOrder(null); }}
        />
      </Modal>

      {/* View modal */}
      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title="Детали заказа" wide>
        {viewOrder && (() => {
          const cost = viewOrder.contractors.reduce((s, c) => s + c.costValue, 0);
          const profit = getProfit(viewOrder);
          const margin = getMargin(viewOrder);
          const hasMissingPayer = viewOrder.contractors.some(c => !c.payerId && c.costValue > 0);
          const hasUnreconciled = viewOrder.contractors.some(c => !c.reconciled && c.costValue > 0);
          const hasUnpaid = viewOrder.contractors.some(c => !c.paid && c.costValue > 0);
          return (
            <div className="space-y-4">
              {(hasMissingPayer || hasUnreconciled || hasUnpaid || !viewOrder.paymentReceived) && (
                <div className="flex flex-wrap gap-2">
                  {hasMissingPayer && <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full flex items-center gap-1"><AlertTriangle size={11} /> Нет плательщика</span>}
                  {hasUnreconciled && <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full flex items-center gap-1"><RefreshCcw size={11} /> Не сверено</span>}
                  {hasUnpaid && <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full flex items-center gap-1"><Ban size={11} /> Не оплачено подрядчику</span>}
                  {!viewOrder.paymentReceived && <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full flex items-center gap-1"><Ban size={11} /> Оплата от клиента не получена</span>}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="font-medium text-gray-500">Дата:</span> {new Date(viewOrder.date).toLocaleDateString('ru-RU')}</div>
                <div><span className="font-medium text-gray-500">Статус:</span> {viewOrder.status === 'completed' ? '✅ Выполнен' : '🔵 Активный'}</div>
                <div><span className="font-medium text-gray-500">Клиент:</span> {clientMap[viewOrder.clientId]?.name || '—'}</div>
                <div><span className="font-medium text-gray-500">Продукция:</span> {viewOrder.productName}</div>
                <div><span className="font-medium text-gray-500">Получатель оплаты:</span> {payerMap[viewOrder.paymentReceiverId]?.name || '—'}</div>
                <div><span className="font-medium text-gray-500">Оплата:</span> {viewOrder.paymentReceived ? '✅ Получена' : '❌ Не получена'}</div>
                {viewOrder.paymentNote && <div className="col-span-2"><span className="font-medium text-gray-500">Счёт/карта:</span> {viewOrder.paymentNote}</div>}
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Подрядчики:</h4>
                <div className="border border-gray-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead><tr className="bg-gray-50 text-gray-600">
                      <th className="px-3 py-2 text-left">Подрядчик</th>
                      <th className="px-3 py-2 text-left">Описание</th>
                      <th className="px-3 py-2 text-right">Стоимость</th>
                      <th className="px-3 py-2 text-left">Плательщик</th>
                      <th className="px-3 py-2 text-center w-12">
                        <Tip text="Оплачено подрядчику">Опл</Tip>
                      </th>
                      <th className="px-3 py-2 text-center w-12">
                        <Tip text="Сверка выполнена">Свер</Tip>
                      </th>
                      <th className="px-3 py-2 text-left">Прим.</th>
                    </tr></thead>
                    <tbody>
                      {viewOrder.contractors.map(c => (
                        <tr key={c.id} className={`border-t border-gray-100 ${!c.payerId && c.costValue > 0 ? 'bg-red-50' : ''}`}>
                          <td className="px-3 py-2">{contractorMap[c.contractorId]?.name || '—'}</td>
                          <td className="px-3 py-2">{c.description}</td>
                          <td className="px-3 py-2 text-right font-mono">{c.costValue.toLocaleString('ru-RU')} ₽</td>
                          <td className="px-3 py-2">{c.payerId ? payerMap[c.payerId]?.name || '—' : <span className="text-red-500 font-medium flex items-center gap-1"><AlertTriangle size={11} /> Нет</span>}</td>
                          <td className="px-3 py-2 text-center">{c.paid ? <CheckCircle2 size={15} className="text-green-500 mx-auto" /> : <Ban size={15} className="text-gray-300 mx-auto" />}</td>
                          <td className="px-3 py-2 text-center">{c.reconciled ? <CheckCircle2 size={15} className="text-blue-500 mx-auto" /> : <Ban size={15} className="text-gray-300 mx-auto" />}</td>
                          <td className="px-3 py-2 text-gray-500">{c.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Реализация</div><div className="font-bold">{viewOrder.saleAmount.toLocaleString('ru-RU')} ₽</div></div>
                <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Себестоимость</div><div className="font-bold">{cost.toLocaleString('ru-RU')} ₽</div></div>
                <div className={`rounded-lg p-3 ${profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="text-xs text-gray-500">Прибыль ({margin.toFixed(1)}%)</div>
                  <div className={`font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{profit.toLocaleString('ru-RU')} ₽</div>
                </div>
                <div className={`rounded-lg p-3 ${viewOrder.paymentReceived ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="text-xs text-gray-500">Оплата клиента</div>
                  <div className={`font-bold text-sm ${viewOrder.paymentReceived ? 'text-green-700' : 'text-red-700'}`}>{viewOrder.paymentReceived ? '✅ Получена' : '❌ Не получена'}</div>
                </div>
              </div>
              {viewOrder.note && <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">{viewOrder.note}</div>}
              <div className="flex gap-2 pt-2">
                <button onClick={() => { setEditOrder(viewOrder); setViewOrder(null); }} className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-yellow-600 flex items-center gap-2"><Pencil size={14} /> Редактировать</button>
                <button onClick={() => duplicateOrder(viewOrder)} className="bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-600 flex items-center gap-2"><Copy size={14} /> Дублировать</button>
                <button onClick={() => handleDelete(viewOrder.id)} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 flex items-center gap-2"><Trash2 size={14} /> Удалить</button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

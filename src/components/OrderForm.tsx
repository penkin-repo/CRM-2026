import { useState, useEffect } from 'react';
import { Order, OrderContractorEntry, Client, Contractor, Payer } from '../types';
import { SearchSelect } from './SearchSelect';
import { evalFormula } from '../utils/formula';
import { v4 as uuid } from 'uuid';

interface Props {
  initial?: Order;
  clients: Client[];
  contractors: Contractor[];
  payers: Payer[];
  onSave: (o: Order) => void;
  onCancel: () => void;
}

function emptyEntry(): OrderContractorEntry {
  return { id: uuid(), contractorId: '', description: '', costFormula: '', costValue: 0, payerId: '', paid: false, reconciled: false, note: '' };
}

export function OrderForm({ initial, clients, contractors, payers, onSave, onCancel }: Props) {
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10));
  const [clientId, setClientId] = useState(initial?.clientId || '');
  const [productName, setProductName] = useState(initial?.productName || '');
  const [entries, setEntries] = useState<OrderContractorEntry[]>(initial?.contractors.length ? initial.contractors : [emptyEntry()]);
  const [saleFormula, setSaleFormula] = useState(initial ? String(initial.saleAmount) : '');
  const [saleAmount, setSaleAmount] = useState(initial?.saleAmount || 0);
  const [paymentReceiverId, setPaymentReceiverId] = useState(initial?.paymentReceiverId || '');
  const [paymentNote, setPaymentNote] = useState(initial?.paymentNote || '');
  const [paymentReceived, setPaymentReceived] = useState(initial?.paymentReceived || false);
  const [status, setStatus] = useState<'active' | 'completed'>(initial?.status || 'active');
  const [note, setNote] = useState(initial?.note || '');

  useEffect(() => {
    setSaleAmount(evalFormula(saleFormula));
  }, [saleFormula]);

  function updateEntry(idx: number, patch: Partial<OrderContractorEntry>) {
    const next = [...entries];
    next[idx] = { ...next[idx], ...patch };
    if ('costFormula' in patch) {
      next[idx].costValue = evalFormula(patch.costFormula || '');
    }
    setEntries(next);
  }

  function addEntry() {
    setEntries([...entries, emptyEntry()]);
  }

  function removeEntry(idx: number) {
    if (entries.length <= 1) return;
    setEntries(entries.filter((_, i) => i !== idx));
  }

  const totalCost = entries.reduce((s, e) => s + e.costValue, 0);
  const profit = saleAmount - totalCost;
  const margin = saleAmount > 0 ? (profit / saleAmount * 100) : 0;

  function handleSubmit() {
    if (!clientId) { alert('Выберите клиента'); return; }
    if (!productName.trim()) { alert('Введите наименование продукции'); return; }
    onSave({
      id: initial?.id || uuid(),
      date,
      clientId,
      productName: productName.trim(),
      contractors: entries,
      saleAmount,
      paymentReceiverId,
      paymentNote,
      paymentReceived,
      status,
      note,
      createdAt: initial?.createdAt || new Date().toISOString(),
    });
  }

  const clientOptions = clients.map(c => ({ value: c.id, label: c.name }));
  const contractorOptions = contractors.map(c => ({ value: c.id, label: c.name }));
  const payerOptions = payers.map(p => ({ value: p.id, label: p.name }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
          <select value={status} onChange={e => setStatus(e.target.value as 'active' | 'completed')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="active">Активный</option>
            <option value="completed">Выполнен</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Клиент *</label>
        <SearchSelect options={clientOptions} value={clientId} onChange={setClientId} placeholder="Выберите клиента..." />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Наименование продукции *</label>
        <input value={productName} onChange={e => setProductName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* Contractor entries - card layout */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-gray-700">Подрядчики и работы</label>
          <button type="button" onClick={addEntry} className="text-blue-600 text-sm hover:underline font-medium">+ Добавить строку</button>
        </div>
        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <div key={entry.id} className="border border-gray-200 rounded-lg p-2.5 bg-gray-100/80 hover:bg-gray-100 transition-colors relative">
              {/* Header row */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-xs font-semibold text-gray-400 w-5">#{idx + 1}</span>
                <div className="flex-1 grid grid-cols-12 gap-1.5">
                  <div className="col-span-4">
                    <SearchSelect options={contractorOptions} value={entry.contractorId} onChange={v => updateEntry(idx, { contractorId: v })} placeholder="Подрядчик..." className="text-sm" />
                  </div>
                  <div className="col-span-3">
                    <input
                      value={entry.costFormula}
                      onChange={e => updateEntry(idx, { costFormula: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                      placeholder="=формула / сумма"
                      title="Можно вводить формулы: =1000+500*2"
                    />
                    {entry.costFormula.startsWith('=') && (
                      <div className="text-xs text-blue-600 mt-0.5 font-mono pl-1">= {entry.costValue.toLocaleString('ru-RU')} ₽</div>
                    )}
                  </div>
                  <div className="col-span-3">
                    <SearchSelect options={payerOptions} value={entry.payerId} onChange={v => updateEntry(idx, { payerId: v })} placeholder="Плательщик..." className="text-sm" />
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-3 pr-1">
                    <label className="flex items-center gap-1 cursor-pointer" title="Оплачено подрядчику">
                      <input type="checkbox" checked={entry.paid} onChange={e => updateEntry(idx, { paid: e.target.checked })} className="w-3.5 h-3.5 rounded text-green-600" />
                      <span className="text-xs text-gray-500">Опл</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer" title="Сверка">
                      <input type="checkbox" checked={entry.reconciled} onChange={e => updateEntry(idx, { reconciled: e.target.checked })} className="w-3.5 h-3.5 rounded text-blue-600" />
                      <span className="text-xs text-gray-500">Свер</span>
                    </label>
                  </div>
                </div>
                {entries.length > 1 && (
                  <button type="button" onClick={() => removeEntry(idx)} className="text-red-400 hover:text-red-600 w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 flex-shrink-0" title="Удалить строку">×</button>
                )}
              </div>
              {/* Description + note row */}
              <div className="grid grid-cols-12 gap-1.5 pl-6">
                <div className="col-span-7">
                  <textarea
                    value={entry.description}
                    onChange={e => updateEntry(idx, { description: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                    placeholder="Описание работ..."
                    rows={2}
                  />
                </div>
                <div className="col-span-4">
                  <input value={entry.note} onChange={e => updateEntry(idx, { note: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Примечание..." />
                </div>
                <div className="col-span-1 flex items-end justify-end pb-1">
                  <span className="font-mono text-xs font-bold text-gray-700 whitespace-nowrap">{entry.costValue.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={addEntry} className="mt-3 w-full border-2 border-dashed border-gray-300 rounded-lg py-2.5 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors">
          + Добавить подрядчика
        </button>
      </div>

      {/* Sale + Payment */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-4">
        <h4 className="text-sm font-semibold text-gray-700">💰 Оплата и реализация</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Сумма реализации</label>
            <input
              value={saleFormula}
              onChange={e => setSaleFormula(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              placeholder="=формула или число"
            />
            <div className="text-xs text-gray-500 mt-1">= {saleAmount.toLocaleString('ru-RU')} ₽</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Получатель оплаты</label>
            <SearchSelect options={payerOptions} value={paymentReceiverId} onChange={setPaymentReceiverId} placeholder="Как получена оплата..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Номер счёта / карты / прим.</label>
            <input
              value={paymentNote}
              onChange={e => setPaymentNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Счёт №123, карта *4523..."
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer bg-white border border-gray-300 rounded-lg px-4 py-2.5 w-full hover:bg-green-50 transition-colors">
              <input type="checkbox" checked={paymentReceived} onChange={e => setPaymentReceived(e.target.checked)} className="w-5 h-5 rounded text-green-600" />
              <span className="text-sm font-medium text-gray-700">Оплата получена</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Себестоимость</div>
            <div className="font-bold text-gray-800">{totalCost.toLocaleString('ru-RU')} ₽</div>
          </div>
          <div className={`rounded-lg p-3 border ${profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="text-xs text-gray-500 mb-1">Прибыль ({margin.toFixed(1)}%)</div>
            <div className={`font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{profit.toLocaleString('ru-RU')} ₽</div>
          </div>
          <div className={`rounded-lg p-3 border ${paymentReceived ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="text-xs text-gray-500 mb-1">Статус оплаты</div>
            <div className={`font-bold text-sm ${paymentReceived ? 'text-green-700' : 'text-yellow-700'}`}>{paymentReceived ? '✅ Оплата получена' : '⏳ Ожидает оплаты'}</div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Примечание к заказу</label>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={handleSubmit} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm">Сохранить заказ</button>
        <button onClick={onCancel} className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-300 font-medium text-sm">Отмена</button>
      </div>
    </div>
  );
}

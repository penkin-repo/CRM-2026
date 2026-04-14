import { useState, useMemo } from 'react';
import {
  Calendar, User, HardHat, CreditCard, Search, X,
  Eye, Copy, CheckCircle2, Ban, AlertTriangle,
  TrendingUp, Wallet, ArrowDownCircle, ArrowUpCircle,
  DollarSign, Lock, Unlock, History, BadgeCheck, ReceiptText
} from 'lucide-react';
import { Order, Client, Contractor, Payer, SalaryRecord } from '../types';
import { SearchSelect } from '../components/SearchSelect';
import { Modal } from '../components/Modal';
import { v4 as uuid } from 'uuid';

interface Props {
  orders: Order[];
  setOrders: (o: Order[], action?: string, desc?: string) => void;
  clients: Client[];
  contractors: Contractor[];
  payers: Payer[];
  salaryRecords: SalaryRecord[];
  setSalaryRecords: (r: SalaryRecord[]) => void;
}

type ReportTab = 'monthly' | 'byClient' | 'byContractor' | 'byPayer' | 'salary';

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

function fmt(n: number) { return n.toLocaleString('ru-RU'); }

function monthLabel(m: string) {
  const [y, mo] = m.split('-');
  const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  return `${months[parseInt(mo) - 1]} ${y}`;
}

export function ReportsPage({ orders, setOrders, clients, contractors, payers, salaryRecords, setSalaryRecords }: Props) {
  const [tab, setTab] = useState<ReportTab>('monthly');
  const [salaryPercent, setSalaryPercent] = useState(60);
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [monthPayerFilter, setMonthPayerFilter] = useState('');
  const [reportClientId, setReportClientId] = useState('');
  const [reportContractorId, setReportContractorId] = useState('');
  const [reportPayerId, setReportPayerId] = useState('');
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');
  const [contextSearch, setContextSearch] = useState('');
  const [viewOrder, setViewOrder] = useState<Order | null>(null);

  // Salary tab state
  const [salMonth, setSalMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [salPercent, setSalPercent] = useState(60);
  const [salPayerFilter, setSalPayerFilter] = useState('');
  const [salViewRecord, setSalViewRecord] = useState<SalaryRecord | null>(null);
  const [salCloseModal, setSalCloseModal] = useState(false);
  const [salClosePaid, setSalClosePaid] = useState('');
  const [salCloseNote, setSalCloseNote] = useState('');
  const [salOpenConfirm, setSalOpenConfirm] = useState<string | null>(null);

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);
  const contractorMap = useMemo(() => Object.fromEntries(contractors.map(c => [c.id, c])), [contractors]);
  const payerMap = useMemo(() => Object.fromEntries(payers.map(p => [p.id, p])), [payers]);

  function getProfit(o: Order) { return o.saleAmount - o.contractors.reduce((s, c) => s + c.costValue, 0); }
  function getMargin(o: Order) { const p = getProfit(o); return o.saleAmount > 0 ? (p / o.saleAmount * 100) : 0; }

  function filterByPeriod(list: Order[]) {
    let r = list;
    if (reportDateFrom) r = r.filter(o => o.date >= reportDateFrom);
    if (reportDateTo) r = r.filter(o => o.date <= reportDateTo);
    return r;
  }

  function filterByContext(list: Order[]) {
    if (!contextSearch.trim()) return list;
    const q = contextSearch.toLowerCase().trim();
    return list.filter(o => {
      const cn = clientMap[o.clientId]?.name || '';
      const cns = o.contractors.map(c => contractorMap[c.contractorId]?.name || '').join(' ');
      const ds = o.contractors.map(c => c.description + ' ' + c.note).join(' ');
      const ps = o.contractors.map(c => payerMap[c.payerId]?.name || '').join(' ');
      const pr = payerMap[o.paymentReceiverId]?.name || '';
      return [o.productName, cn, cns, ds, ps, pr, o.note, o.date, o.paymentNote || ''].join(' ').toLowerCase().includes(q);
    });
  }

  function updateContractorEntry(orderId: string, entryId: string, patch: { paid?: boolean; reconciled?: boolean; payerId?: string }) {
    const updated = orders.map(o => {
      if (o.id !== orderId) return o;
      return { ...o, contractors: o.contractors.map(c => c.id !== entryId ? c : { ...c, ...patch }) };
    });
    const desc = patch.paid !== undefined ? 'Изменена оплата' : patch.reconciled !== undefined ? 'Изменена сверка' : 'Изменён плательщик';
    setOrders(updated, 'update_report', desc);
  }

  function updateOrderPaymentReceiver(orderId: string, paymentReceiverId: string) {
    setOrders(orders.map(o => o.id !== orderId ? o : { ...o, paymentReceiverId }), 'update_report', 'Изменён получатель');
  }

  function updateOrderPaymentReceived(orderId: string, paymentReceived: boolean) {
    setOrders(orders.map(o => o.id !== orderId ? o : { ...o, paymentReceived }), 'update_report', `Оплата: ${paymentReceived ? 'получена' : 'не получена'}`);
  }

  function duplicateOrder(o: Order) {
    const newOrder: Order = {
      ...JSON.parse(JSON.stringify(o)),
      id: uuid(), date: new Date().toISOString().slice(0, 10), status: 'active' as const,
      paymentReceived: false, createdAt: new Date().toISOString(),
      contractors: o.contractors.map(c => ({ ...c, id: uuid(), paid: false, reconciled: false })),
    };
    setOrders([...orders, newOrder], 'duplicate_order', `Дублирован: ${o.productName}`);
    setViewOrder(null);
  }

  // ===== MONTHLY =====
  const monthOrders = useMemo(() => {
    const mo = orders.filter(o => o.date.slice(0, 7) === reportMonth);
    return filterByContext(mo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, reportMonth, contextSearch]);

  const monthStats = useMemo(() => {
    const revenue = monthOrders.reduce((s, o) => s + o.saleAmount, 0);
    const cost = monthOrders.reduce((s, o) => s + o.contractors.reduce((ss, c) => ss + c.costValue, 0), 0);
    const profit = revenue - cost;
    const salary = profit > 0 ? profit * salaryPercent / 100 : 0;
    const unpaidOrders = monthOrders.filter(o => !o.paymentReceived).length;
    const missingPayer = monthOrders.filter(o => o.contractors.some(c => !c.payerId && c.costValue > 0)).length;
    const unreconciled = monthOrders.reduce((s, o) => s + o.contractors.filter(c => !c.reconciled && c.costValue > 0).length, 0);
    const unpaidContractors = monthOrders.reduce((s, o) => s + o.contractors.filter(c => !c.paid && c.costValue > 0).length, 0);
    return { revenue, cost, profit, salary, unpaidOrders, missingPayer, unreconciled, unpaidContractors };
  }, [monthOrders, salaryPercent]);

  const payerExpenseData = useMemo(() => {
    const map: Record<string, number> = {};
    monthOrders.forEach(o => o.contractors.forEach(c => {
      if (c.payerId) map[c.payerId] = (map[c.payerId] || 0) + c.costValue;
    }));
    return payers.filter(p => map[p.id]).map(p => ({ id: p.id, name: p.name, total: map[p.id] || 0 }));
  }, [monthOrders, payers]);

  const payerIncomeData = useMemo(() => {
    const map: Record<string, number> = {};
    monthOrders.forEach(o => {
      if (o.paymentReceiverId) map[o.paymentReceiverId] = (map[o.paymentReceiverId] || 0) + o.saleAmount;
    });
    return payers.filter(p => map[p.id]).map(p => ({ id: p.id, name: p.name, total: map[p.id] || 0 }));
  }, [monthOrders, payers]);

  const monthPayerOrders = useMemo(() => {
    if (!monthPayerFilter) return [];
    return monthOrders.filter(o =>
      o.contractors.some(c => c.payerId === monthPayerFilter) || o.paymentReceiverId === monthPayerFilter
    );
  }, [monthOrders, monthPayerFilter]);

  const monthPayerStats = useMemo(() => {
    let exp = 0, inc = 0;
    monthPayerOrders.forEach(o => {
      o.contractors.forEach(c => { if (c.payerId === monthPayerFilter) exp += c.costValue; });
      if (o.paymentReceiverId === monthPayerFilter) inc += o.saleAmount;
    });
    return { exp, inc, net: inc - exp };
  }, [monthPayerOrders, monthPayerFilter]);

  // ===== BY CLIENT =====
  const byClientData = useMemo(() => {
    let filtered = reportClientId ? orders.filter(o => o.clientId === reportClientId) : orders;
    filtered = filterByPeriod(filtered);
    filtered = filterByContext(filtered);
    const revenue = filtered.reduce((s, o) => s + o.saleAmount, 0);
    const cost = filtered.reduce((s, o) => s + o.contractors.reduce((ss, c) => ss + c.costValue, 0), 0);
    return { orders: filtered, revenue, cost, profit: revenue - cost };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, reportClientId, reportDateFrom, reportDateTo, contextSearch]);

  // ===== BY CONTRACTOR =====
  const byContractorData = useMemo(() => {
    let filtered = orders;
    if (reportContractorId) filtered = filtered.filter(o => o.contractors.some(c => c.contractorId === reportContractorId));
    filtered = filterByPeriod(filtered);
    filtered = filterByContext(filtered);
    let total = 0, paid = 0, unpaid = 0, reconciled = 0;
    const entries: { order: Order; entry: Order['contractors'][0] }[] = [];
    filtered.forEach(o => o.contractors.forEach(c => {
      if (!reportContractorId || c.contractorId === reportContractorId) {
        total += c.costValue;
        if (c.paid) paid += c.costValue; else unpaid += c.costValue;
        if (c.reconciled) reconciled += c.costValue;
        entries.push({ order: o, entry: c });
      }
    }));
    return { total, paid, unpaid, reconciled, entries };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, reportContractorId, reportDateFrom, reportDateTo, contextSearch]);

  // ===== BY PAYER =====
  const byPayerData = useMemo(() => {
    let filtered = orders;
    if (reportPayerId) {
      filtered = filtered.filter(o =>
        o.contractors.some(c => c.payerId === reportPayerId) || o.paymentReceiverId === reportPayerId
      );
    }
    filtered = filterByPeriod(filtered);
    filtered = filterByContext(filtered);
    let totalExpense = 0, paidExp = 0, unpaidExp = 0, reconciledExp = 0, totalIncome = 0;
    const expEntries: { order: Order; entry: Order['contractors'][0] }[] = [];
    const incEntries: { order: Order }[] = [];
    filtered.forEach(o => {
      o.contractors.forEach(c => {
        if (!reportPayerId || c.payerId === reportPayerId) {
          totalExpense += c.costValue;
          if (c.paid) paidExp += c.costValue; else unpaidExp += c.costValue;
          if (c.reconciled) reconciledExp += c.costValue;
          expEntries.push({ order: o, entry: c });
        }
      });
      if (!reportPayerId || o.paymentReceiverId === reportPayerId) {
        totalIncome += o.saleAmount;
        incEntries.push({ order: o });
      }
    });
    return { totalExpense, paidExp, unpaidExp, reconciledExp, totalIncome, expEntries, incEntries };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, reportPayerId, reportDateFrom, reportDateTo, contextSearch]);

  // ===== SALARY TAB =====
  const salOrders = useMemo(() => orders.filter(o => o.date.slice(0, 7) === salMonth), [orders, salMonth]);

  const salStats = useMemo(() => {
    const revenue = salOrders.reduce((s, o) => s + o.saleAmount, 0);
    const cost = salOrders.reduce((s, o) => s + o.contractors.reduce((ss, c) => ss + c.costValue, 0), 0);
    const profit = revenue - cost;
    const baseSalary = profit > 0 ? profit * salPercent / 100 : 0;
    return { revenue, cost, profit, baseSalary };
  }, [salOrders, salPercent]);

  const salPayerStats = useMemo(() => {
    return payers.map(p => {
      let exp = 0, inc = 0;
      salOrders.forEach(o => {
        o.contractors.forEach(c => { if (c.payerId === p.id) exp += c.costValue; });
        if (o.paymentReceiverId === p.id) inc += o.saleAmount;
      });
      return { id: p.id, name: p.name, exp, inc, net: inc - exp };
    }).filter(p => p.exp > 0 || p.inc > 0);
  }, [salOrders, payers]);

  const salPayerOrders = useMemo(() => {
    if (!salPayerFilter) return [];
    return salOrders.filter(o =>
      o.contractors.some(c => c.payerId === salPayerFilter) || o.paymentReceiverId === salPayerFilter
    );
  }, [salOrders, salPayerFilter]);

  const salPayerDetail = useMemo(() => {
    if (!salPayerFilter) return { exp: 0, inc: 0, net: 0, entries: [] as { type: 'exp' | 'inc'; order: Order; entry?: Order['contractors'][0] }[] };
    let exp = 0, inc = 0;
    const entries: { type: 'exp' | 'inc'; order: Order; entry?: Order['contractors'][0] }[] = [];
    salPayerOrders.forEach(o => {
      o.contractors.forEach(c => {
        if (c.payerId === salPayerFilter) {
          exp += c.costValue;
          entries.push({ type: 'exp', order: o, entry: c });
        }
      });
      if (o.paymentReceiverId === salPayerFilter) {
        inc += o.saleAmount;
        entries.push({ type: 'inc', order: o });
      }
    });
    return { exp, inc, net: inc - exp, entries };
  }, [salPayerOrders, salPayerFilter]);

  // For selected payer: salary correction = net (positive = payer deposited into cash, so subtract; negative = payer spent from pocket, so add)
  const salPayerNet = salPayerFilter ? salPayerDetail.net : 0;
  // Final salary after cash correction
  const finalSalary = salStats.baseSalary - salPayerNet;

  const existingSalRecord = useMemo(() => salaryRecords.find(r => r.month === salMonth), [salaryRecords, salMonth]);

  function handleCloseSalary() {
    const paid = parseFloat(salClosePaid) || 0;
    const now = new Date().toISOString();
    if (existingSalRecord) {
      const updated: SalaryRecord = {
        ...existingSalRecord,
        paidAmount: paid,
        finalSalary,
        baseSalary: salStats.baseSalary,
        salaryPercent: salPercent,
        closedAt: now,
        note: salCloseNote,
        history: [...existingSalRecord.history, {
          timestamp: now, action: 'Закрытие месяца',
          prevPaid: existingSalRecord.paidAmount, newPaid: paid, note: salCloseNote
        }],
      };
      setSalaryRecords(salaryRecords.map(r => r.month === salMonth ? updated : r));
    } else {
      const adj = salPayerStats.map(p => ({ payerId: p.id, income: p.inc, expense: p.exp, net: p.net }));
      const rec: SalaryRecord = {
        id: uuid(), month: salMonth, salaryPercent: salPercent,
        baseSalary: salStats.baseSalary,
        payerAdjustments: adj,
        totalAdjustment: salPayerNet,
        finalSalary, paidAmount: paid, closedAt: now, note: salCloseNote,
        history: [{ timestamp: now, action: 'Закрытие месяца', prevPaid: 0, newPaid: paid, note: salCloseNote }],
      };
      setSalaryRecords([...salaryRecords, rec]);
    }
    setSalCloseModal(false);
    setSalClosePaid('');
    setSalCloseNote('');
  }

  function handleOpenSalary(id: string) {
    const now = new Date().toISOString();
    setSalaryRecords(salaryRecords.map(r => {
      if (r.id !== id) return r;
      return { ...r, closedAt: null, history: [...r.history, { timestamp: now, action: 'Переоткрытие', prevPaid: r.paidAmount, newPaid: r.paidAmount, note: 'Месяц переоткрыт' }] };
    }));
    setSalOpenConfirm(null);
  }

  const reportTabs: { key: ReportTab; label: string; icon: React.ReactNode }[] = [
    { key: 'monthly', label: 'Месячный', icon: <Calendar size={14} /> },
    { key: 'byClient', label: 'По клиенту', icon: <User size={14} /> },
    { key: 'byContractor', label: 'По подрядчику', icon: <HardHat size={14} /> },
    { key: 'byPayer', label: 'По плательщику', icon: <CreditCard size={14} /> },
    { key: 'salary', label: 'Зарплата', icon: <DollarSign size={14} /> },
  ];

  const clientOpts = clients.map(c => ({ value: c.id, label: c.name }));
  const contractorOpts = contractors.map(c => ({ value: c.id, label: c.name }));
  const payerOpts = payers.map(p => ({ value: p.id, label: p.name }));

  function renderViewModal() {
    if (!viewOrder) return null;
    const vo = viewOrder;
    const cost = vo.contractors.reduce((s, c) => s + c.costValue, 0);
    const profit = getProfit(vo);
    const margin = getMargin(vo);
    return (
      <Modal open onClose={() => setViewOrder(null)} title="Детали заказа" wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="font-medium text-gray-500">Дата:</span> {new Date(vo.date).toLocaleDateString('ru-RU')}</div>
            <div><span className="font-medium text-gray-500">Статус:</span> {vo.status === 'completed' ? '✅ Выполнен' : '🔵 Активный'}</div>
            <div><span className="font-medium text-gray-500">Клиент:</span> {clientMap[vo.clientId]?.name || '—'}</div>
            <div><span className="font-medium text-gray-500">Продукция:</span> {vo.productName}</div>
            <div><span className="font-medium text-gray-500">Получатель оплаты:</span> {payerMap[vo.paymentReceiverId]?.name || '—'}</div>
            <div><span className="font-medium text-gray-500">Оплата:</span> {vo.paymentReceived ? '✅ Получена' : '❌ Не получена'}</div>
            {vo.paymentNote && <div className="col-span-2"><span className="font-medium text-gray-500">Счёт/карта:</span> {vo.paymentNote}</div>}
          </div>
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead><tr className="bg-gray-50 text-gray-600">
                <th className="px-3 py-2 text-left">Подрядчик</th>
                <th className="px-3 py-2 text-left">Описание</th>
                <th className="px-3 py-2 text-right">Сумма</th>
                <th className="px-3 py-2 text-left">Плательщик</th>
                <th className="px-3 py-2 text-center w-10"><Tip text="Оплачено подрядчику">Опл</Tip></th>
                <th className="px-3 py-2 text-center w-10"><Tip text="Сверка">Свер</Tip></th>
              </tr></thead>
              <tbody>
                {vo.contractors.map(c => (
                  <tr key={c.id} className={`border-t border-gray-100 ${!c.payerId && c.costValue > 0 ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-2 font-medium">{contractorMap[c.contractorId]?.name || '—'}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{c.description}</td>
                    <td className="px-3 py-2 text-right font-mono font-medium">{fmt(c.costValue)} ₽</td>
                    <td className="px-3 py-2">{c.payerId ? payerMap[c.payerId]?.name || '—' : <span className="text-red-500 text-xs flex items-center gap-1"><AlertTriangle size={10} /> Нет</span>}</td>
                    <td className="px-3 py-2 text-center">{c.paid ? <CheckCircle2 size={14} className="text-green-500 mx-auto" /> : <Ban size={14} className="text-gray-300 mx-auto" />}</td>
                    <td className="px-3 py-2 text-center">{c.reconciled ? <CheckCircle2 size={14} className="text-blue-500 mx-auto" /> : <Ban size={14} className="text-gray-300 mx-auto" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Реализация</div><div className="font-bold">{fmt(vo.saleAmount)} ₽</div></div>
            <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Себестоимость</div><div className="font-bold">{fmt(cost)} ₽</div></div>
            <div className={`rounded-lg p-3 ${profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}><div className="text-xs text-gray-500">Прибыль ({margin.toFixed(1)}%)</div><div className={`font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(profit)} ₽</div></div>
            <div className={`rounded-lg p-3 ${vo.paymentReceived ? 'bg-green-50' : 'bg-red-50'}`}><div className="text-xs text-gray-500">Оплата</div><div className={`font-bold text-sm ${vo.paymentReceived ? 'text-green-700' : 'text-red-700'}`}>{vo.paymentReceived ? '✅ Получена' : '❌ Не получена'}</div></div>
          </div>
          {vo.note && <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">{vo.note}</div>}
          <div className="flex gap-2 pt-2">
            <button onClick={() => duplicateOrder(vo)} className="bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-600 flex items-center gap-2"><Copy size={14} /> Дублировать</button>
            <button onClick={() => setViewOrder(null)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300">Закрыть</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <div>
      {renderViewModal()}

      {/* Salary close modal */}
      {salCloseModal && (
        <Modal open onClose={() => setSalCloseModal(false)} title={`Закрыть месяц: ${monthLabel(salMonth)}`}>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Прибыль за месяц:</span><span className="font-bold">{fmt(salStats.profit)} ₽</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Зарплата ({salPercent}%):</span><span className="font-bold text-blue-700">{fmt(salStats.baseSalary)} ₽</span></div>
              {salPayerFilter && salPayerNet !== 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{payerMap[salPayerFilter]?.name} ({salPayerNet > 0 ? '→ в кассу' : '← из кармана'}):</span>
                  <span className={salPayerNet > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{salPayerNet > 0 ? '-' : '+'}{fmt(Math.abs(salPayerNet))} ₽</span>
                </div>
              )}
              <div className="border-t border-blue-200 pt-2 flex justify-between font-bold">
                <span>Итого к выплате:</span>
                <span className={finalSalary >= 0 ? 'text-green-700' : 'text-red-700'}>{fmt(finalSalary)} ₽</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Фактически выплачено (₽)</label>
              <input type="number" value={salClosePaid} onChange={e => setSalClosePaid(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={fmt(finalSalary)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Примечание</label>
              <input value={salCloseNote} onChange={e => setSalCloseNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Перевод на карту, наличные..." />
            </div>
            <div className="flex gap-3">
              <button onClick={handleCloseSalary} className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-green-700 flex items-center gap-2">
                <Lock size={14} /> Закрыть месяц
              </button>
              <button onClick={() => setSalCloseModal(false)} className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm hover:bg-gray-300">Отмена</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Open salary confirm */}
      {salOpenConfirm && (
        <Modal open onClose={() => setSalOpenConfirm(null)} title="Переоткрыть месяц?">
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              Месяц был закрыт. Переоткрыть? Все данные сохранятся, но месяц можно будет изменить.
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleOpenSalary(salOpenConfirm)} className="bg-orange-500 text-white px-5 py-2 rounded-lg text-sm hover:bg-orange-600 flex items-center gap-2">
                <Unlock size={14} /> Переоткрыть
              </button>
              <button onClick={() => setSalOpenConfirm(null)} className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm hover:bg-gray-300">Отмена</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Salary record details modal */}
      {salViewRecord && (
        <Modal open onClose={() => setSalViewRecord(null)} title={`История зарплаты: ${monthLabel(salViewRecord.month)}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Зарплата (база)</div><div className="font-bold">{fmt(salViewRecord.baseSalary)} ₽</div></div>
              <div className="bg-gray-50 rounded-lg p-3"><div className="text-xs text-gray-500">Процент</div><div className="font-bold">{salViewRecord.salaryPercent}%</div></div>
              <div className="bg-blue-50 rounded-lg p-3"><div className="text-xs text-gray-500">Итого к выплате</div><div className="font-bold text-blue-700">{fmt(salViewRecord.finalSalary)} ₽</div></div>
              <div className={`rounded-lg p-3 ${salViewRecord.closedAt ? 'bg-green-50' : 'bg-yellow-50'}`}><div className="text-xs text-gray-500">Выплачено</div><div className={`font-bold ${salViewRecord.closedAt ? 'text-green-700' : 'text-yellow-700'}`}>{fmt(salViewRecord.paidAmount)} ₽</div></div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><History size={14} /> История изменений:</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {salViewRecord.history.map((h, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-2.5 text-xs">
                    <div className="flex justify-between text-gray-500 mb-1">
                      <span className="font-medium text-gray-700">{h.action}</span>
                      <span>{new Date(h.timestamp).toLocaleString('ru-RU')}</span>
                    </div>
                    <div className="text-gray-600">Выплата: {fmt(h.prevPaid)} → {fmt(h.newPaid)} ₽</div>
                    {h.note && <div className="text-gray-500 mt-0.5">{h.note}</div>}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setSalViewRecord(null)} className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm hover:bg-gray-300 w-full">Закрыть</button>
          </div>
        </Modal>
      )}

      {/* Report tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {reportTabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setContextSearch(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Context search (not for salary tab) */}
      {tab !== 'salary' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 flex items-center gap-3">
          <Search size={16} className="text-amber-500 shrink-0" />
          <input value={contextSearch} onChange={e => setContextSearch(e.target.value)}
            placeholder='Поиск по тексту: "листовки", "баннер", "Альфа"...'
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder-amber-400" />
          {contextSearch && (
            <button onClick={() => setContextSearch('')} className="text-amber-500 hover:text-amber-700"><X size={15} /></button>
          )}
        </div>
      )}

      {/* ===== MONTHLY ===== */}
      {tab === 'monthly' && (
        <div>
          <div className="flex flex-wrap gap-3 mb-6 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Месяц</label>
              <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">% зарплаты от прибыли</label>
              <input type="number" value={salaryPercent} onChange={e => setSalaryPercent(Number(e.target.value))} min={0} max={100}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="min-w-[220px]">
              <label className="block text-xs text-gray-500 mb-1">Детализация по плательщику</label>
              <SearchSelect options={payerOpts} value={monthPayerFilter} onChange={setMonthPayerFilter} placeholder="Все плательщики" />
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl p-4 shadow">
              <div className="text-xs opacity-80 mb-1 flex items-center gap-1"><ReceiptText size={12} /> Заказов</div>
              <div className="text-2xl font-bold">{monthOrders.length}</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-xl p-4 shadow">
              <div className="text-xs opacity-80 mb-1 flex items-center gap-1"><TrendingUp size={12} /> Реализация</div>
              <div className="text-xl font-bold">{fmt(monthStats.revenue)} ₽</div>
              <div className="text-xs opacity-70">Себест.: {fmt(monthStats.cost)} ₽</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-700 text-white rounded-xl p-4 shadow">
              <div className="text-xs opacity-80 mb-1 flex items-center gap-1"><Wallet size={12} /> Прибыль</div>
              <div className="text-xl font-bold">{fmt(monthStats.profit)} ₽</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-xl p-4 shadow">
              <div className="text-xs opacity-80 mb-1 flex items-center gap-1"><DollarSign size={12} /> Зарплата ({salaryPercent}%)</div>
              <div className="text-xl font-bold">{fmt(monthStats.salary)} ₽</div>
            </div>
          </div>

          {/* Payer detail block on top */}
          {monthPayerFilter && (
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CreditCard size={16} className="text-blue-500" />
                Детализация: {payerMap[monthPayerFilter]?.name}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-lg p-4 border border-orange-200 shadow-sm">
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><ArrowDownCircle size={12} className="text-orange-500" /> Потратил (расходы)</div>
                  <div className="text-xl font-bold text-orange-600">{fmt(monthPayerStats.exp)} ₽</div>
                  <div className="text-xs text-gray-400 mt-1">Оплата подрядчикам</div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><ArrowUpCircle size={12} className="text-green-500" /> Получил (доходы)</div>
                  <div className="text-xl font-bold text-green-600">{fmt(monthPayerStats.inc)} ₽</div>
                  <div className="text-xs text-gray-400 mt-1">Оплата от клиентов</div>
                </div>
                <div className={`bg-white rounded-lg p-4 border shadow-sm ${monthPayerStats.net > 0 ? 'border-red-200' : 'border-blue-200'}`}>
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    {monthPayerStats.net > 0 ? <ArrowDownCircle size={12} className="text-red-500" /> : <ArrowUpCircle size={12} className="text-blue-500" />}
                    {monthPayerStats.net > 0 ? 'В кассу' : 'Из кассы / долг агентства'}
                  </div>
                  <div className={`text-xl font-bold ${monthPayerStats.net > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {monthPayerStats.net > 0 ? '+' : ''}{fmt(monthPayerStats.net)} ₽
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {monthPayerStats.net > 0
                      ? `Получил больше на ${fmt(monthPayerStats.net)} ₽ → вносит в кассу`
                      : monthPayerStats.net < 0
                        ? `Потратил больше на ${fmt(Math.abs(monthPayerStats.net))} ₽ → агентство возмещает`
                        : 'Баланс нулевой'}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-white/70 text-gray-600 text-xs">
                    <th className="px-3 py-2 text-left">Тип</th>
                    <th className="px-3 py-2 text-left">Дата</th>
                    <th className="px-3 py-2 text-left">Клиент / Продукция</th>
                    <th className="px-3 py-2 text-left">Подрядчик / Описание</th>
                    <th className="px-3 py-2 text-right">Сумма</th>
                  </tr></thead>
                  <tbody>
                    {monthPayerOrders.map(o => {
                      const expRows = o.contractors.filter(c => c.payerId === monthPayerFilter);
                      const isInc = o.paymentReceiverId === monthPayerFilter;
                      return (
                        <>
                          {expRows.map(c => (
                            <tr key={c.id} className="border-t border-white/50 hover:bg-orange-50/50">
                              <td className="px-3 py-1.5"><span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">Расход</span></td>
                              <td className="px-3 py-1.5 text-gray-500 text-xs">{new Date(o.date).toLocaleDateString('ru-RU')}</td>
                              <td className="px-3 py-1.5"><div className="font-medium text-xs">{clientMap[o.clientId]?.name || '—'}</div><div className="text-gray-400 text-xs">{o.productName}</div></td>
                              <td className="px-3 py-1.5"><div className="text-xs">{contractorMap[c.contractorId]?.name || '—'}</div><div className="text-gray-400 text-xs">{c.description}</div></td>
                              <td className="px-3 py-1.5 text-right font-mono font-medium text-orange-600">{fmt(c.costValue)} ₽</td>
                            </tr>
                          ))}
                          {isInc && (
                            <tr className="border-t border-white/50 hover:bg-green-50/50">
                              <td className="px-3 py-1.5"><span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Доход</span></td>
                              <td className="px-3 py-1.5 text-gray-500 text-xs">{new Date(o.date).toLocaleDateString('ru-RU')}</td>
                              <td className="px-3 py-1.5 col-span-2"><div className="font-medium text-xs">{clientMap[o.clientId]?.name || '—'}</div><div className="text-gray-400 text-xs">{o.productName}</div></td>
                              <td className="px-3 py-1.5"></td>
                              <td className="px-3 py-1.5 text-right font-mono font-medium text-green-600">{fmt(o.saleAmount)} ₽</td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Warnings */}
          {(monthStats.unpaidOrders > 0 || monthStats.missingPayer > 0 || monthStats.unreconciled > 0 || monthStats.unpaidContractors > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex flex-wrap gap-4">
              {monthStats.unpaidOrders > 0 && <div className="flex items-center gap-2 text-sm text-amber-700"><AlertTriangle size={14} /> {monthStats.unpaidOrders} заказов без оплаты от клиента</div>}
              {monthStats.missingPayer > 0 && <div className="flex items-center gap-2 text-sm text-red-700"><AlertTriangle size={14} /> {monthStats.missingPayer} заказов — не проставлен плательщик</div>}
              {monthStats.unreconciled > 0 && <div className="flex items-center gap-2 text-sm text-blue-700"><AlertTriangle size={14} /> {monthStats.unreconciled} позиций не сверено</div>}
              {monthStats.unpaidContractors > 0 && <div className="flex items-center gap-2 text-sm text-orange-700"><AlertTriangle size={14} /> {monthStats.unpaidContractors} позиций не оплачено подрядчику</div>}
            </div>
          )}

          {/* Expense / Income by payer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-orange-50">
                <ArrowDownCircle size={15} className="text-orange-500" />
                <span className="font-semibold text-sm text-gray-700">Расходы по плательщикам</span>
                <span className="ml-auto text-xs text-gray-500">Кто оплачивал подрядчиков</span>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-xs text-gray-500"><th className="px-4 py-2 text-left">Плательщик</th><th className="px-4 py-2 text-right">Сумма</th></tr></thead>
                <tbody>
                  {payerExpenseData.map(p => (
                    <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2">{p.name}</td>
                      <td className="px-4 py-2 text-right font-mono font-medium text-orange-600">{fmt(p.total)} ₽</td>
                    </tr>
                  ))}
                  {payerExpenseData.length === 0 && <tr><td colSpan={2} className="px-4 py-4 text-center text-gray-400 text-xs">Нет данных</td></tr>}
                  <tr className="border-t-2 border-orange-200 bg-orange-50/50">
                    <td className="px-4 py-2 font-semibold text-sm">Итого</td>
                    <td className="px-4 py-2 text-right font-mono font-bold text-orange-700">{fmt(payerExpenseData.reduce((s, p) => s + p.total, 0))} ₽</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-green-50">
                <ArrowUpCircle size={15} className="text-green-500" />
                <span className="font-semibold text-sm text-gray-700">Доходы по получателям</span>
                <span className="ml-auto text-xs text-gray-500">Кто получал оплату от клиентов</span>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-xs text-gray-500"><th className="px-4 py-2 text-left">Получатель</th><th className="px-4 py-2 text-right">Сумма</th></tr></thead>
                <tbody>
                  {payerIncomeData.map(p => (
                    <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2">{p.name}</td>
                      <td className="px-4 py-2 text-right font-mono font-medium text-green-600">{fmt(p.total)} ₽</td>
                    </tr>
                  ))}
                  {payerIncomeData.length === 0 && <tr><td colSpan={2} className="px-4 py-4 text-center text-gray-400 text-xs">Нет данных</td></tr>}
                  <tr className="border-t-2 border-green-200 bg-green-50/50">
                    <td className="px-4 py-2 font-semibold text-sm">Итого</td>
                    <td className="px-4 py-2 text-right font-mono font-bold text-green-700">{fmt(payerIncomeData.reduce((s, p) => s + p.total, 0))} ₽</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Orders table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">Заказы за {monthLabel(reportMonth)}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-xs text-gray-500">
                  <th className="px-3 py-2 text-left">Дата</th>
                  <th className="px-3 py-2 text-left">Клиент</th>
                  <th className="px-3 py-2 text-left">Продукция</th>
                  <th className="px-3 py-2 text-right">Реализация</th>
                  <th className="px-3 py-2 text-right">Себест.</th>
                  <th className="px-3 py-2 text-right">Прибыль</th>
                  <th className="px-3 py-2 text-left">Получатель</th>
                  <th className="px-3 py-2 text-center w-10"><Tip text="Оплата от клиента">💰</Tip></th>
                  <th className="px-3 py-2 text-center w-8"></th>
                </tr></thead>
                <tbody>
                  {monthOrders.map(o => {
                    const cost = o.contractors.reduce((s, c) => s + c.costValue, 0);
                    const profit = o.saleAmount - cost;
                    return (
                      <tr key={o.id} onClick={() => setViewOrder(o)} className={`border-t border-gray-100 cursor-pointer hover:bg-blue-50/30 transition-colors ${o.status === 'completed' ? 'bg-green-50/30' : ''}`}>
                        <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{new Date(o.date).toLocaleDateString('ru-RU')}</td>
                        <td className="px-3 py-2 font-medium text-xs">{clientMap[o.clientId]?.name || '—'}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">{o.productName}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{fmt(o.saleAmount)} ₽</td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-gray-500">{fmt(cost)} ₽</td>
                        <td className={`px-3 py-2 text-right font-mono text-xs font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(profit)} ₽</td>
                        <td className="px-3 py-2 text-xs">{payerMap[o.paymentReceiverId]?.name || <span className="text-gray-300">—</span>}</td>
                        <td className="px-3 py-2 text-center" onClick={e => { e.stopPropagation(); updateOrderPaymentReceived(o.id, !o.paymentReceived); }}>
                          {o.paymentReceived ? <CheckCircle2 size={14} className="text-green-500 mx-auto" /> : <Ban size={14} className="text-gray-300 mx-auto" />}
                        </td>
                        <td className="px-3 py-2 text-center"><Eye size={13} className="text-gray-400 mx-auto" /></td>
                      </tr>
                    );
                  })}
                  {monthOrders.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-gray-400">Нет заказов за выбранный месяц</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== BY CLIENT ===== */}
      {tab === 'byClient' && (
        <div>
          <div className="flex flex-wrap gap-3 mb-6 items-end">
            <div className="min-w-[220px]">
              <label className="block text-xs text-gray-500 mb-1">Клиент</label>
              <SearchSelect options={clientOpts} value={reportClientId} onChange={setReportClientId} placeholder="Все клиенты" />
            </div>
            <div><label className="block text-xs text-gray-500 mb-1">С</label><input type="date" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">По</label><input type="date" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            {(reportClientId || reportDateFrom || reportDateTo) && <button onClick={() => { setReportClientId(''); setReportDateFrom(''); setReportDateTo(''); }} className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1 mt-4"><X size={14} />Сбросить</button>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4"><div className="text-xs text-gray-500 mb-1">Заказов</div><div className="text-2xl font-bold text-blue-700">{byClientData.orders.length}</div></div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4"><div className="text-xs text-gray-500 mb-1">Реализация</div><div className="text-xl font-bold text-indigo-700">{fmt(byClientData.revenue)} ₽</div></div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4"><div className="text-xs text-gray-500 mb-1">Себестоимость</div><div className="text-xl font-bold text-orange-700">{fmt(byClientData.cost)} ₽</div></div>
            <div className={`rounded-xl p-4 border ${byClientData.profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}><div className="text-xs text-gray-500 mb-1">Прибыль</div><div className={`text-xl font-bold ${byClientData.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(byClientData.profit)} ₽</div></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-xs text-gray-500">
                  <th className="px-3 py-2 text-left">Дата</th>
                  <th className="px-3 py-2 text-left">Клиент</th>
                  <th className="px-3 py-2 text-left">Продукция</th>
                  <th className="px-3 py-2 text-right">Реализация</th>
                  <th className="px-3 py-2 text-right">Прибыль</th>
                  <th className="px-3 py-2 text-center w-10"><Tip text="Оплата от клиента">💰</Tip></th>
                  <th className="px-3 py-2 text-center w-8"></th>
                </tr></thead>
                <tbody>
                  {byClientData.orders.map(o => {
                    const profit = getProfit(o);
                    return (
                      <tr key={o.id} onClick={() => setViewOrder(o)} className="border-t border-gray-100 cursor-pointer hover:bg-blue-50/30">
                        <td className="px-3 py-2 text-gray-500 text-xs">{new Date(o.date).toLocaleDateString('ru-RU')}</td>
                        <td className="px-3 py-2 font-medium text-xs">{clientMap[o.clientId]?.name || '—'}</td>
                        <td className="px-3 py-2 text-xs">{o.productName}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{fmt(o.saleAmount)} ₽</td>
                        <td className={`px-3 py-2 text-right font-mono text-xs font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(profit)} ₽</td>
                        <td className="px-3 py-2 text-center">{o.paymentReceived ? <CheckCircle2 size={13} className="text-green-500 mx-auto" /> : <Ban size={13} className="text-gray-300 mx-auto" />}</td>
                        <td className="px-3 py-2 text-center"><Eye size={13} className="text-gray-400 mx-auto" /></td>
                      </tr>
                    );
                  })}
                  {byClientData.orders.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-400">Нет заказов</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== BY CONTRACTOR ===== */}
      {tab === 'byContractor' && (
        <div>
          <div className="flex flex-wrap gap-3 mb-6 items-end">
            <div className="min-w-[220px]">
              <label className="block text-xs text-gray-500 mb-1">Подрядчик</label>
              <SearchSelect options={contractorOpts} value={reportContractorId} onChange={setReportContractorId} placeholder="Все подрядчики" />
            </div>
            <div><label className="block text-xs text-gray-500 mb-1">С</label><input type="date" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">По</label><input type="date" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            {(reportContractorId || reportDateFrom || reportDateTo) && <button onClick={() => { setReportContractorId(''); setReportDateFrom(''); setReportDateTo(''); }} className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1 mt-4"><X size={14} />Сбросить</button>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4"><div className="text-xs text-gray-500 mb-1">Всего работ</div><div className="text-2xl font-bold text-blue-700">{fmt(byContractorData.total)} ₽</div></div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4"><div className="text-xs text-gray-500 mb-1">Оплачено</div><div className="text-xl font-bold text-green-700">{fmt(byContractorData.paid)} ₽</div></div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4"><div className="text-xs text-gray-500 mb-1">Не оплачено</div><div className="text-xl font-bold text-red-700">{fmt(byContractorData.unpaid)} ₽</div></div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4"><div className="text-xs text-gray-500 mb-1">Сверено</div><div className="text-xl font-bold text-blue-700">{fmt(byContractorData.reconciled)} ₽</div></div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 text-xs text-gray-500">
                  <th className="px-3 py-2 text-left">Дата</th>
                  <th className="px-3 py-2 text-left">Клиент</th>
                  <th className="px-3 py-2 text-left">Продукция</th>
                  <th className="px-3 py-2 text-left">Подрядчик</th>
                  <th className="px-3 py-2 text-left">Описание</th>
                  <th className="px-3 py-2 text-right">Стоимость</th>
                  <th className="px-3 py-2 text-left">Плательщик</th>
                  <th className="px-3 py-2 text-center w-16"><Tip text="Оплачено подрядчику">Опл</Tip></th>
                  <th className="px-3 py-2 text-center w-16"><Tip text="Сверка">Свер</Tip></th>
                  <th className="px-3 py-2 text-center w-8"></th>
                </tr></thead>
                <tbody>
                  {byContractorData.entries.map(({ order: o, entry: c }) => (
                    <tr key={c.id} className={`border-t border-gray-100 hover:bg-gray-50 ${!c.payerId && c.costValue > 0 ? 'bg-red-50/50' : ''}`}>
                      <td className="px-3 py-2 text-xs text-gray-500">{new Date(o.date).toLocaleDateString('ru-RU')}</td>
                      <td className="px-3 py-2 text-xs font-medium">{clientMap[o.clientId]?.name || '—'}</td>
                      <td className="px-3 py-2 text-xs">{o.productName}</td>
                      <td className="px-3 py-2 text-xs">{contractorMap[c.contractorId]?.name || '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{c.description}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs font-medium">{fmt(c.costValue)} ₽</td>
                      <td className="px-3 py-2 min-w-[140px]">
                        <SearchSelect options={[{ value: '', label: '— нет —' }, ...payerOpts]} value={c.payerId} onChange={v => updateContractorEntry(o.id, c.id, { payerId: v })} placeholder="Выбрать..." />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={c.paid} onChange={e => updateContractorEntry(o.id, c.id, { paid: e.target.checked })} className="w-4 h-4 rounded text-green-600 cursor-pointer" />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={c.reconciled} onChange={e => updateContractorEntry(o.id, c.id, { reconciled: e.target.checked })} className="w-4 h-4 rounded text-blue-600 cursor-pointer" />
                      </td>
                      <td className="px-3 py-2 text-center"><button onClick={() => setViewOrder(o)} className="text-gray-400 hover:text-blue-600"><Eye size={13} /></button></td>
                    </tr>
                  ))}
                  {byContractorData.entries.length === 0 && <tr><td colSpan={10} className="py-8 text-center text-gray-400">Нет данных</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== BY PAYER ===== */}
      {tab === 'byPayer' && (
        <div>
          <div className="flex flex-wrap gap-3 mb-6 items-end">
            <div className="min-w-[220px]">
              <label className="block text-xs text-gray-500 mb-1">Плательщик / Получатель</label>
              <SearchSelect options={payerOpts} value={reportPayerId} onChange={setReportPayerId} placeholder="Все" />
            </div>
            <div><label className="block text-xs text-gray-500 mb-1">С</label><input type="date" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">По</label><input type="date" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            {(reportPayerId || reportDateFrom || reportDateTo) && <button onClick={() => { setReportPayerId(''); setReportDateFrom(''); setReportDateTo(''); }} className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1 mt-4"><X size={14} />Сбросить</button>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4"><div className="text-xs text-gray-500 mb-1">Расходы (оплатил)</div><div className="text-xl font-bold text-orange-700">{fmt(byPayerData.totalExpense)} ₽</div></div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4"><div className="text-xs text-gray-500 mb-1">Оплачено</div><div className="text-xl font-bold text-green-700">{fmt(byPayerData.paidExp)} ₽</div></div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4"><div className="text-xs text-gray-500 mb-1">Не оплачено</div><div className="text-xl font-bold text-red-700">{fmt(byPayerData.unpaidExp)} ₽</div></div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4"><div className="text-xs text-gray-500 mb-1">Доходы (получил)</div><div className="text-xl font-bold text-blue-700">{fmt(byPayerData.totalIncome)} ₽</div></div>
          </div>

          {byPayerData.expEntries.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700 bg-orange-50 flex items-center gap-2">
                <ArrowDownCircle size={14} className="text-orange-500" /> Расходы — оплата подрядчикам
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-xs text-gray-500">
                    <th className="px-3 py-2 text-left">Дата</th>
                    <th className="px-3 py-2 text-left">Клиент</th>
                    <th className="px-3 py-2 text-left">Продукция</th>
                    <th className="px-3 py-2 text-left">Подрядчик</th>
                    <th className="px-3 py-2 text-left">Описание</th>
                    <th className="px-3 py-2 text-right">Стоимость</th>
                    <th className="px-3 py-2 text-center w-16">Опл</th>
                    <th className="px-3 py-2 text-center w-16">Свер</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr></thead>
                  <tbody>
                    {byPayerData.expEntries.map(({ order: o, entry: c }) => (
                      <tr key={c.id} className="border-t border-gray-100 hover:bg-orange-50/30">
                        <td className="px-3 py-1.5 text-xs text-gray-500">{new Date(o.date).toLocaleDateString('ru-RU')}</td>
                        <td className="px-3 py-1.5 text-xs font-medium">{clientMap[o.clientId]?.name || '—'}</td>
                        <td className="px-3 py-1.5 text-xs">{o.productName}</td>
                        <td className="px-3 py-1.5 text-xs">{contractorMap[c.contractorId]?.name || '—'}</td>
                        <td className="px-3 py-1.5 text-xs text-gray-500">{c.description}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-xs font-medium">{fmt(c.costValue)} ₽</td>
                        <td className="px-3 py-1.5 text-center"><input type="checkbox" checked={c.paid} onChange={e => updateContractorEntry(o.id, c.id, { paid: e.target.checked })} className="w-4 h-4 rounded text-green-600 cursor-pointer" /></td>
                        <td className="px-3 py-1.5 text-center"><input type="checkbox" checked={c.reconciled} onChange={e => updateContractorEntry(o.id, c.id, { reconciled: e.target.checked })} className="w-4 h-4 rounded text-blue-600 cursor-pointer" /></td>
                        <td className="px-3 py-1.5 text-center"><button onClick={() => setViewOrder(o)} className="text-gray-400 hover:text-blue-600"><Eye size={13} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {byPayerData.incEntries.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700 bg-green-50 flex items-center gap-2">
                <ArrowUpCircle size={14} className="text-green-500" /> Доходы — оплата от клиентов
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-xs text-gray-500">
                    <th className="px-3 py-2 text-left">Дата</th>
                    <th className="px-3 py-2 text-left">Клиент</th>
                    <th className="px-3 py-2 text-left">Продукция</th>
                    <th className="px-3 py-2 text-right">Реализация</th>
                    <th className="px-3 py-2 text-left">Получатель</th>
                    <th className="px-3 py-2 text-center w-10"><Tip text="Оплата от клиента">💰</Tip></th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr></thead>
                  <tbody>
                    {byPayerData.incEntries.map(({ order: o }) => (
                      <tr key={o.id} className="border-t border-gray-100 hover:bg-green-50/30">
                        <td className="px-3 py-1.5 text-xs text-gray-500">{new Date(o.date).toLocaleDateString('ru-RU')}</td>
                        <td className="px-3 py-1.5 text-xs font-medium">{clientMap[o.clientId]?.name || '—'}</td>
                        <td className="px-3 py-1.5 text-xs">{o.productName}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-xs font-medium">{fmt(o.saleAmount)} ₽</td>
                        <td className="px-3 py-1.5 min-w-[140px]">
                          <SearchSelect options={[{ value: '', label: '— нет —' }, ...payerOpts]} value={o.paymentReceiverId} onChange={v => updateOrderPaymentReceiver(o.id, v)} placeholder="Выбрать..." />
                        </td>
                        <td className="px-3 py-1.5 text-center" onClick={() => updateOrderPaymentReceived(o.id, !o.paymentReceived)}>
                          {o.paymentReceived ? <CheckCircle2 size={13} className="text-green-500 mx-auto cursor-pointer" /> : <Ban size={13} className="text-gray-300 mx-auto cursor-pointer" />}
                        </td>
                        <td className="px-3 py-1.5 text-center"><button onClick={() => setViewOrder(o)} className="text-gray-400 hover:text-blue-600"><Eye size={13} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== SALARY ===== */}
      {tab === 'salary' && (
        <div>
          {/* Controls */}
          <div className="flex flex-wrap gap-3 mb-5 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Месяц</label>
              <input type="month" value={salMonth} onChange={e => setSalMonth(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">% от прибыли</label>
              <input type="number" value={salPercent} onChange={e => setSalPercent(Number(e.target.value))} min={0} max={100}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-1">Плательщик (кассовая корректировка)</label>
              <SearchSelect options={[{ value: '', label: '— не выбран —' }, ...payerOpts]} value={salPayerFilter} onChange={setSalPayerFilter} placeholder="Выбрать..." />
            </div>
            <div className="flex-1 flex justify-end gap-2">
              {existingSalRecord?.closedAt ? (
                <button onClick={() => setSalOpenConfirm(existingSalRecord.id)}
                  className="flex items-center gap-2 bg-orange-100 text-orange-700 border border-orange-300 px-4 py-2 rounded-lg text-sm hover:bg-orange-200">
                  <Unlock size={14} /> Переоткрыть
                </button>
              ) : (
                <button onClick={() => setSalCloseModal(true)}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 shadow">
                  <Lock size={14} /> Закрыть месяц
                </button>
              )}
            </div>
          </div>

          {/* Closed month banner */}
          {existingSalRecord?.closedAt && (
            <div className="bg-green-50 border border-green-300 rounded-xl p-3 mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BadgeCheck size={18} className="text-green-600 shrink-0" />
                <div>
                  <div className="font-semibold text-green-800 text-sm">Месяц закрыт · Выплачено: {fmt(existingSalRecord.paidAmount)} ₽</div>
                  <div className="text-xs text-green-600">
                    {new Date(existingSalRecord.closedAt).toLocaleString('ru-RU')}{existingSalRecord.note && ` · ${existingSalRecord.note}`}
                  </div>
                </div>
              </div>
              <button onClick={() => setSalViewRecord(existingSalRecord)} className="flex items-center gap-2 text-sm text-green-700 hover:text-green-900 px-3 py-1.5 rounded-lg hover:bg-green-100 whitespace-nowrap">
                <History size={14} /> История
              </button>
            </div>
          )}

          {/* ===== COMPACT ALL-IN-ONE SUMMARY ===== */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5 shadow-sm">
            {/* Row 1: base financials */}
            <div className="grid grid-cols-4 divide-x divide-gray-100">
              <div className="p-4">
                <div className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><TrendingUp size={11} /> Реализация</div>
                <div className="text-lg font-bold text-gray-800">{fmt(salStats.revenue)} ₽</div>
              </div>
              <div className="p-4">
                <div className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><ArrowDownCircle size={11} /> Себестоимость</div>
                <div className="text-lg font-bold text-orange-600">{fmt(salStats.cost)} ₽</div>
              </div>
              <div className="p-4">
                <div className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Wallet size={11} /> Прибыль</div>
                <div className={`text-lg font-bold ${salStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(salStats.profit)} ₽</div>
              </div>
              <div className="p-4 bg-purple-50">
                <div className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><DollarSign size={11} /> Зарплата {salPercent}%</div>
                <div className="text-lg font-bold text-purple-700">{fmt(salStats.baseSalary)} ₽</div>
              </div>
            </div>

            {/* Row 2: payer cash block — only when payer selected */}
            {salPayerFilter && (
              <>
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Касса — {payerMap[salPayerFilter]?.name}
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-100">
                  <div className="p-4">
                    <div className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><ArrowUpCircle size={11} className="text-green-500" /> Получил от клиентов</div>
                    <div className="text-lg font-bold text-green-600">{fmt(salPayerDetail.inc)} ₽</div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><ArrowDownCircle size={11} className="text-orange-500" /> Потратил на подрядчиков</div>
                    <div className="text-lg font-bold text-orange-600">{fmt(salPayerDetail.exp)} ₽</div>
                  </div>
                  <div className={`p-4 ${salPayerNet > 0 ? 'bg-red-50' : salPayerNet < 0 ? 'bg-blue-50' : ''}`}>
                    <div className="text-xs text-gray-400 mb-0.5">
                      {salPayerNet > 0 ? '→ Вносит в кассу' : salPayerNet < 0 ? '← Агентство возмещает' : 'Баланс'}
                    </div>
                    <div className={`text-lg font-bold ${salPayerNet > 0 ? 'text-red-600' : salPayerNet < 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {fmt(Math.abs(salPayerNet))} ₽
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Row 3: итоговая зарплата */}
            <div className="border-t-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 px-4 py-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <span className="text-gray-600">
                    Зарплата: <span className="font-semibold text-purple-700">{fmt(salStats.baseSalary)} ₽</span>
                  </span>
                  {salPayerFilter && salPayerNet !== 0 && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      {salPayerNet > 0
                        ? <><span className="text-red-500 font-medium">− {fmt(salPayerNet)} ₽</span><span className="text-gray-400 ml-1">(внёс в кассу)</span></>
                        : <><span className="text-green-500 font-medium">+ {fmt(Math.abs(salPayerNet))} ₽</span><span className="text-gray-400 ml-1">(потратил из кармана)</span></>
                      }
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium">ИТОГО К ВЫПЛАТЕ:</span>
                  <span className={`text-2xl font-black ${finalSalary >= 0 ? 'text-purple-700' : 'text-red-700'}`}>{fmt(finalSalary)} ₽</span>
                </div>
              </div>
              {existingSalRecord?.closedAt && (
                <div className="mt-2 flex items-center gap-4 text-xs border-t border-purple-100 pt-2">
                  <span className="text-green-700 flex items-center gap-1">
                    <BadgeCheck size={12} /> Выплачено: <strong>{fmt(existingSalRecord.paidAmount)} ₽</strong>
                  </span>
                  {existingSalRecord.paidAmount !== finalSalary && (
                    <span className={existingSalRecord.paidAmount > finalSalary ? 'text-blue-600' : 'text-red-600'}>
                      {existingSalRecord.paidAmount > finalSalary
                        ? `Переплата: ${fmt(existingSalRecord.paidAmount - finalSalary)} ₽`
                        : `Долг: ${fmt(finalSalary - existingSalRecord.paidAmount)} ₽`}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Payer detail table */}
          {salPayerFilter && salPayerDetail.entries.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
              <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700 flex items-center gap-2">
                <CreditCard size={14} className="text-blue-500" />
                Движения — {payerMap[salPayerFilter]?.name}
                <span className="ml-auto flex gap-4 text-xs font-normal">
                  <span className="text-orange-600">Расход: {fmt(salPayerDetail.exp)} ₽</span>
                  <span className="text-green-600">Доход: {fmt(salPayerDetail.inc)} ₽</span>
                  <span className={salPayerNet > 0 ? 'text-red-600 font-semibold' : 'text-blue-600 font-semibold'}>
                    {salPayerNet > 0 ? '→ в кассу' : '← долг агентства'}: {fmt(Math.abs(salPayerNet))} ₽
                  </span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-xs text-gray-500">
                    <th className="px-3 py-2 text-left">Тип</th>
                    <th className="px-3 py-2 text-left">Дата</th>
                    <th className="px-3 py-2 text-left">Клиент · Продукция</th>
                    <th className="px-3 py-2 text-left">Подрядчик · Описание</th>
                    <th className="px-3 py-2 text-right">Сумма</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr></thead>
                  <tbody>
                    {salPayerDetail.entries.map((row, i) => (
                      <tr key={i} className={`border-t border-gray-100 hover:bg-gray-50 ${row.type === 'exp' ? '' : 'bg-green-50/20'}`}>
                        <td className="px-3 py-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${row.type === 'exp' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                            {row.type === 'exp' ? 'Расход' : 'Доход'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-xs text-gray-500 whitespace-nowrap">{new Date(row.order.date).toLocaleDateString('ru-RU')}</td>
                        <td className="px-3 py-1.5 text-xs">
                          <div className="font-medium">{clientMap[row.order.clientId]?.name || '—'}</div>
                          <div className="text-gray-400">{row.order.productName}</div>
                        </td>
                        <td className="px-3 py-1.5 text-xs text-gray-500">
                          {row.type === 'exp' && row.entry
                            ? <><div>{contractorMap[row.entry.contractorId]?.name || '—'}</div><div className="text-gray-400">{row.entry.description}</div></>
                            : '—'}
                        </td>
                        <td className={`px-3 py-1.5 text-right font-mono text-sm font-semibold ${row.type === 'exp' ? 'text-orange-600' : 'text-green-600'}`}>
                          {fmt(row.type === 'exp' && row.entry ? row.entry.costValue : row.order.saleAmount)} ₽
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <button onClick={() => setViewOrder(row.order)} className="text-gray-400 hover:text-blue-600"><Eye size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Salary history */}
          {salaryRecords.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700 flex items-center gap-2">
                <History size={14} className="text-gray-500" /> История закрытых месяцев
              </div>
              <div className="divide-y divide-gray-100">
                {[...salaryRecords].sort((a, b) => b.month.localeCompare(a.month)).map(r => (
                  <div key={r.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      {r.closedAt ? <BadgeCheck size={16} className="text-green-500" /> : <AlertTriangle size={16} className="text-yellow-500" />}
                      <div>
                        <div className="font-medium text-sm">{monthLabel(r.month)}</div>
                        <div className="text-xs text-gray-500">
                          {r.salaryPercent}% · Зарплата: {fmt(r.finalSalary)} ₽
                          {r.closedAt ? ` · Выплачено: ${fmt(r.paidAmount)} ₽` : ' · Не закрыт'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSalViewRecord(r)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-blue-50">
                        <History size={12} /> История
                      </button>
                      {r.closedAt && (
                        <button onClick={() => { setSalOpenConfirm(r.id); setSalMonth(r.month); }}
                          className="text-xs text-orange-600 hover:text-orange-800 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-orange-50">
                          <Unlock size={12} /> Открыть
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

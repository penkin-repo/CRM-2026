import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ClipboardList, Users, HardHat, CreditCard, BarChart2, Clock, Settings,
  Download, Upload, RotateCcw, ChevronDown, Loader2
} from 'lucide-react';
import { Client, Contractor, Payer, Order, DashboardFilters, HistoryEntry, SalaryRecord } from './types';
import { loadFilters, saveFilters } from './store';
import {
  fetchClients, fetchContractors, fetchPayers, fetchOrders,
  fetchHistory, fetchSalaryRecords,
  upsertClient, deleteClient,
  upsertContractor, deleteContractor,
  upsertPayer, deletePayer,
  upsertOrder, deleteOrder,
  pushHistoryEntry, clearHistory as apiClearHistory,
  upsertSalaryRecord,
  saveAllClients, saveAllContractors, saveAllPayers, saveAllOrders,
} from './api';
import { v4 as uuid } from 'uuid';
import { LoginScreen } from './components/LoginScreen';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { ContractorsPage } from './pages/ContractorsPage';
import { PayersPage } from './pages/PayersPage';
import { ReportsPage } from './pages/ReportsPage';
import { HistoryPage } from './pages/HistoryPage';

type Tab = 'dashboard' | 'clients' | 'contractors' | 'payers' | 'reports' | 'history';

export function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('auth') === '1');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [tab, setTab] = useState<Tab>('dashboard');
  const [clients, setClientsRaw] = useState<Client[]>([]);
  const [contractors, setContractorsRaw] = useState<Contractor[]>([]);
  const [payers, setPayersRaw] = useState<Payer[]>([]);
  const [orders, setOrdersRaw] = useState<Order[]>([]);
  const [filters, setFiltersState] = useState<DashboardFilters>(loadFilters);
  const [history, setHistoryState] = useState<HistoryEntry[]>([]);
  const [salaryRecords, setSalaryRecordsRaw] = useState<SalaryRecord[]>([]);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Load all data from API on mount (after auth)
  useEffect(() => {
    if (!authed) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      fetchClients(),
      fetchContractors(),
      fetchPayers(),
      fetchOrders(),
      fetchHistory(),
      fetchSalaryRecords(),
    ]).then(([c, con, p, o, h, s]) => {
      setClientsRaw(c);
      setContractorsRaw(con);
      setPayersRaw(p);
      setOrdersRaw(o);
      setHistoryState(h);
      setSalaryRecordsRaw(s);
      setLoadError('');
    }).catch(err => {
      setLoadError(err.message ?? 'Ошибка загрузки данных');
    }).finally(() => {
      setLoading(false);
    });
  }, [authed]);

  // Close settings on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    }
    if (showSettings) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettings]);

  const setFilters = useCallback((f: DashboardFilters) => {
    setFiltersState(f);
    saveFilters(f); // filters stay in localStorage — no sensitive data
  }, []);

  // ── History helpers ────────────────────────────────────────────────────────

  async function recordHistory(action: string, description: string, snap: {
    clients: Client[]; contractors: Contractor[]; payers: Payer[]; orders: Order[];
  }) {
    const entry: HistoryEntry = {
      id: uuid(),
      timestamp: new Date().toISOString(),
      action,
      description,
      snapshot: JSON.parse(JSON.stringify(snap)),
    };
    await pushHistoryEntry(entry);
    setHistoryState(prev => [entry, ...prev].slice(0, 50));
  }

  function currentSnap() {
    return {
      clients: JSON.parse(JSON.stringify(clients)),
      contractors: JSON.parse(JSON.stringify(contractors)),
      payers: JSON.parse(JSON.stringify(payers)),
      orders: JSON.parse(JSON.stringify(orders)),
    };
  }

  // ── Setters with history + API persistence ─────────────────────────────────

  const setClients = useCallback((next: Client[], action?: string, desc?: string) => {
    const snap = currentSnap();
    setClientsRaw(next);
    const added = next.filter(n => !clients.find(c => c.id === n.id));
    const updated = next.filter(n => clients.find(c => c.id === n.id));
    const removed = clients.filter(c => !next.find(n => n.id === c.id));
    Promise.all([
      ...[...added, ...updated].map(upsertClient),
      ...removed.map(c => deleteClient(c.id)),
    ]);
    if (action) recordHistory(action, desc || action, snap);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, contractors, payers, orders]);

  const setContractors = useCallback((next: Contractor[], action?: string, desc?: string) => {
    const snap = currentSnap();
    setContractorsRaw(next);
    const added = next.filter(n => !contractors.find(c => c.id === n.id));
    const updated = next.filter(n => contractors.find(c => c.id === n.id));
    const removed = contractors.filter(c => !next.find(n => n.id === c.id));
    Promise.all([
      ...[...added, ...updated].map(upsertContractor),
      ...removed.map(c => deleteContractor(c.id)),
    ]);
    if (action) recordHistory(action, desc || action, snap);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, contractors, payers, orders]);

  const setPayers = useCallback((next: Payer[], action?: string, desc?: string) => {
    const snap = currentSnap();
    setPayersRaw(next);
    const added = next.filter(n => !payers.find(p => p.id === n.id));
    const updated = next.filter(n => payers.find(p => p.id === n.id));
    const removed = payers.filter(p => !next.find(n => n.id === p.id));
    Promise.all([
      ...[...added, ...updated].map(upsertPayer),
      ...removed.map(p => deletePayer(p.id)),
    ]);
    if (action) recordHistory(action, desc || action, snap);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, contractors, payers, orders]);

  const setOrders = useCallback((next: Order[], action?: string, desc?: string) => {
    const snap = currentSnap();
    setOrdersRaw(next);
    const added = next.filter(n => !orders.find(o => o.id === n.id));
    const updated = next.filter(n => orders.find(o => o.id === n.id));
    const removed = orders.filter(o => !next.find(n => n.id === o.id));
    Promise.all([
      ...[...added, ...updated].map(upsertOrder),
      ...removed.map(o => deleteOrder(o.id)),
    ]);
    if (action) recordHistory(action, desc || action, snap);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, contractors, payers, orders]);

  // ── Undo ───────────────────────────────────────────────────────────────────

  async function handleUndo(entry: HistoryEntry) {
    const { snapshot: s } = entry;
    setClientsRaw(s.clients);
    setContractorsRaw(s.contractors);
    setPayersRaw(s.payers);
    setOrdersRaw(s.orders);
    await Promise.all([
      saveAllClients(s.clients),
      saveAllContractors(s.contractors),
      saveAllPayers(s.payers),
      saveAllOrders(s.orders),
    ]);
    setShowUndoToast(true);
    setTimeout(() => setShowUndoToast(false), 3000);
  }

  async function handleUndoLast() {
    if (history.length === 0) return;
    await handleUndo(history[0]);
    const next = history.slice(1);
    setHistoryState(next);
    setShowSettings(false);
  }

  async function handleClearHistory() {
    if (confirm('Очистить всю историю изменений?')) {
      await apiClearHistory();
      setHistoryState([]);
    }
  }

  // ── Export / Import ────────────────────────────────────────────────────────

  function handleExportJSON() {
    const data = { clients, contractors, payers, orders, salaryRecords, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agency-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowSettings(false);
  }

  function handleImportJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          const snap = currentSnap();
          await recordHistory('import', 'Импорт данных из JSON', snap);
          if (data.clients) { setClientsRaw(data.clients); await saveAllClients(data.clients); }
          if (data.contractors) { setContractorsRaw(data.contractors); await saveAllContractors(data.contractors); }
          if (data.payers) { setPayersRaw(data.payers); await saveAllPayers(data.payers); }
          if (data.orders) { setOrdersRaw(data.orders); await saveAllOrders(data.orders); }
          alert('Данные успешно импортированы!');
        } catch {
          alert('Ошибка при импорте файла');
        }
      };
      reader.readAsText(file);
    };
    input.click();
    setShowSettings(false);
  }

  // ── Salary ─────────────────────────────────────────────────────────────────

  const setSalaryRecords = useCallback((next: SalaryRecord[]) => {
    setSalaryRecordsRaw(next);
    const prev = salaryRecords;
    const added = next.filter(n => !prev.find(p => p.id === n.id));
    const updated = next.filter(n => prev.find(p => p.id === n.id));
    Promise.all([...added, ...updated].map(upsertSalaryRecord));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salaryRecords]);

  // ── Auth gates ─────────────────────────────────────────────────────────────

  if (!authed) return <LoginScreen onSuccess={() => setAuthed(true)} />;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <span className="text-sm">Загрузка данных...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-sm w-full text-center">
          <p className="text-red-600 font-medium mb-2">Ошибка подключения к базе данных</p>
          <p className="text-sm text-gray-500 mb-4">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Заказы', icon: <ClipboardList size={16} /> },
    { key: 'clients', label: 'Клиенты', icon: <Users size={16} /> },
    { key: 'contractors', label: 'Подрядчики', icon: <HardHat size={16} /> },
    { key: 'payers', label: 'Плательщики', icon: <CreditCard size={16} /> },
    { key: 'reports', label: 'Отчёты', icon: <BarChart2 size={16} /> },
    { key: 'history', label: 'История', icon: <Clock size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {showUndoToast && (
        <div className="fixed top-4 right-4 z-[200] bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in">
          <RotateCcw size={16} /> Данные восстановлены
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">РА</div>
              <h1 className="text-lg font-bold text-gray-800 hidden sm:block">Рекламное Агентство</h1>
            </div>

            {/* Settings dropdown */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings(v => !v)}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Настройки"
              >
                <Settings size={16} />
                <span className="hidden sm:inline">Настройки</span>
                <ChevronDown size={14} className={`transition-transform ${showSettings ? 'rotate-180' : ''}`} />
                {history.length > 0 && (
                  <span className="bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded-full ml-1">{history.length}</span>
                )}
              </button>

              {showSettings && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">Данные</div>
                  <button
                    onClick={handleImportJSON}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Upload size={15} className="text-blue-500" />
                    Импорт из JSON
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Download size={15} className="text-green-500" />
                    Экспорт в JSON
                  </button>

                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-t border-gray-100 mt-1">История</div>
                  <button
                    onClick={handleUndoLast}
                    disabled={history.length === 0}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={history.length === 0 ? 'История пуста' : 'Отменить последнее действие'}
                  >
                    <RotateCcw size={15} className="text-orange-500" />
                    Отменить последнее
                    {history.length > 0 && <span className="ml-auto bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded-full">{history.length}</span>}
                  </button>
                  <button
                    onClick={() => { setTab('history'); setShowSettings(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Clock size={15} className="text-gray-500" />
                    Журнал изменений
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex gap-0 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
                  tab === t.key
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                {t.key === 'dashboard' && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full ml-1">
                    {orders.filter(o => o.status === 'active').length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {tab === 'dashboard' && (
          <DashboardPage
            orders={orders} setOrders={setOrders}
            clients={clients} contractors={contractors} payers={payers}
            filters={filters} setFilters={setFilters}
          />
        )}
        {tab === 'clients' && <ClientsPage clients={clients} setClients={setClients} orders={orders} setOrders={setOrders} contractors={contractors} payers={payers} />}
        {tab === 'contractors' && <ContractorsPage contractors={contractors} setContractors={setContractors} />}
        {tab === 'payers' && <PayersPage payers={payers} setPayers={setPayers} />}
        {tab === 'reports' && <ReportsPage orders={orders} setOrders={setOrders} clients={clients} contractors={contractors} payers={payers} salaryRecords={salaryRecords} setSalaryRecords={setSalaryRecords} />}
        {tab === 'history' && <HistoryPage history={history} onUndo={handleUndo} onClear={handleClearHistory} />}
      </main>
    </div>
  );
}

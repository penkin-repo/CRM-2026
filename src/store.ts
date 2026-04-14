import { Client, Contractor, Payer, Order, DashboardFilters, SalaryRecord } from './types';
import { seedClients, seedContractors, seedPayers, seedOrders } from './seedData';

const KEYS = {
  clients: 'agency_clients',
  contractors: 'agency_contractors',
  payers: 'agency_payers',
  orders: 'agency_orders',
  filters: 'agency_filters',
  salaryRecords: 'agency_salary_records',
  seeded: 'agency_seeded',
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return fallback;
}

function save(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Seed data on first launch
function ensureSeeded() {
  if (!localStorage.getItem(KEYS.seeded)) {
    save(KEYS.clients, seedClients);
    save(KEYS.contractors, seedContractors);
    save(KEYS.payers, seedPayers);
    save(KEYS.orders, seedOrders);
    localStorage.setItem(KEYS.seeded, 'true');
  }
}

ensureSeeded();

export function loadClients(): Client[] { return load(KEYS.clients, []); }
export function saveClients(d: Client[]) { save(KEYS.clients, d); }

export function loadContractors(): Contractor[] { return load(KEYS.contractors, []); }
export function saveContractors(d: Contractor[]) { save(KEYS.contractors, d); }

export function loadPayers(): Payer[] { return load(KEYS.payers, []); }
export function savePayers(d: Payer[]) { save(KEYS.payers, d); }

export function loadOrders(): Order[] { return load(KEYS.orders, []); }
export function saveOrders(d: Order[]) { save(KEYS.orders, d); }

export const defaultFilters: DashboardFilters = {
  status: 'active',
  dateFrom: '',
  dateTo: '',
  month: '',
  searchText: '',
  sortBy: 'date',
  sortDir: 'desc',
};

export function loadFilters(): DashboardFilters { return load(KEYS.filters, defaultFilters); }
export function saveFilters(d: DashboardFilters) { save(KEYS.filters, d); }

export function loadSalaryRecords(): SalaryRecord[] { return load(KEYS.salaryRecords, []); }
export function saveSalaryRecords(d: SalaryRecord[]) { save(KEYS.salaryRecords, d); }

export function exportAllData() {
  return {
    clients: loadClients(),
    contractors: loadContractors(),
    payers: loadPayers(),
    orders: loadOrders(),
    salaryRecords: loadSalaryRecords(),
    exportedAt: new Date().toISOString(),
  };
}

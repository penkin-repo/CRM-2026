import { Client, Contractor, Payer, Order, HistoryEntry, SalaryRecord } from './types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function verifyPassword(password: string): Promise<boolean> {
  try {
    await request('/auth', { method: 'POST', body: JSON.stringify({ password }) });
    return true;
  } catch {
    return false;
  }
}

// ── Clients ───────────────────────────────────────────────────────────────────

export async function fetchClients(): Promise<Client[]> {
  return request<Client[]>('/clients');
}

export async function upsertClient(client: Client): Promise<void> {
  await request('/clients', { method: 'POST', body: JSON.stringify(client) });
}

export async function deleteClient(id: string): Promise<void> {
  await request(`/clients?id=${id}`, { method: 'DELETE' });
}

// ── Contractors ───────────────────────────────────────────────────────────────

export async function fetchContractors(): Promise<Contractor[]> {
  return request<Contractor[]>('/contractors');
}

export async function upsertContractor(contractor: Contractor): Promise<void> {
  await request('/contractors', { method: 'POST', body: JSON.stringify(contractor) });
}

export async function deleteContractor(id: string): Promise<void> {
  await request(`/contractors?id=${id}`, { method: 'DELETE' });
}

// ── Payers ────────────────────────────────────────────────────────────────────

export async function fetchPayers(): Promise<Payer[]> {
  return request<Payer[]>('/payers');
}

export async function upsertPayer(payer: Payer): Promise<void> {
  await request('/payers', { method: 'POST', body: JSON.stringify(payer) });
}

export async function deletePayer(id: string): Promise<void> {
  await request(`/payers?id=${id}`, { method: 'DELETE' });
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function fetchOrders(): Promise<Order[]> {
  return request<Order[]>('/orders');
}

export async function upsertOrder(order: Order): Promise<void> {
  await request('/orders', { method: 'POST', body: JSON.stringify(order) });
}

export async function deleteOrder(id: string): Promise<void> {
  await request(`/orders?id=${id}`, { method: 'DELETE' });
}

// ── History ───────────────────────────────────────────────────────────────────

export async function fetchHistory(): Promise<HistoryEntry[]> {
  return request<HistoryEntry[]>('/history');
}

export async function pushHistoryEntry(entry: HistoryEntry): Promise<void> {
  await request('/history', { method: 'POST', body: JSON.stringify(entry) });
}

export async function clearHistory(): Promise<void> {
  await request('/history', { method: 'DELETE' });
}

// ── Salary Records ────────────────────────────────────────────────────────────

export async function fetchSalaryRecords(): Promise<SalaryRecord[]> {
  return request<SalaryRecord[]>('/salary');
}

export async function upsertSalaryRecord(record: SalaryRecord): Promise<void> {
  await request('/salary', { method: 'POST', body: JSON.stringify(record) });
}

export async function deleteSalaryRecord(id: string): Promise<void> {
  await request(`/salary?id=${id}`, { method: 'DELETE' });
}

// ── Bulk save helpers (used by App.tsx for batch snapshot restore) ─────────────

export async function saveAllClients(clients: Client[]): Promise<void> {
  await Promise.all(clients.map(upsertClient));
}

export async function saveAllContractors(contractors: Contractor[]): Promise<void> {
  await Promise.all(contractors.map(upsertContractor));
}

export async function saveAllPayers(payers: Payer[]): Promise<void> {
  await Promise.all(payers.map(upsertPayer));
}

export async function saveAllOrders(orders: Order[]): Promise<void> {
  await Promise.all(orders.map(upsertOrder));
}

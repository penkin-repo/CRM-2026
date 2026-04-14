import { Client, Contractor, Payer, Order, HistoryEntry } from './types';
import { v4 as uuid } from 'uuid';

const HISTORY_KEY = 'agency_history';
const MAX_HISTORY = 50;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export function saveHistory(h: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

export function pushHistory(
  history: HistoryEntry[],
  action: string,
  description: string,
  snapshot: { clients: Client[]; contractors: Contractor[]; payers: Payer[]; orders: Order[] }
): HistoryEntry[] {
  const entry: HistoryEntry = {
    id: uuid(),
    timestamp: new Date().toISOString(),
    action,
    description,
    snapshot: JSON.parse(JSON.stringify(snapshot)),
  };
  const next = [entry, ...history].slice(0, MAX_HISTORY);
  saveHistory(next);
  return next;
}

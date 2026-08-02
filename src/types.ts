export interface CustomField { label: string; value: string }

export interface Client {
  id: string
  name: string
  phone: string
  contactPerson: string
  email: string
  note: string
  customFields: CustomField[]
  createdAt: string
}

export interface Contractor {
  id: string
  name: string
  phone: string
  note: string
  createdAt: string
}

export interface Payer {
  id: string
  name: string
  type: 'cashless' | 'cash' | 'card'
  createdAt: string
}

export interface OrderContractorRow {
  id: string
  contractorId: string
  description: string
  costFormula: string
  costValue: number
  payerId: string
  paid: boolean
  reconciled: boolean
  note: string
}

export interface Order {
  id: string
  date: string
  clientId: string
  productName: string
  contractors: OrderContractorRow[]
  saleAmount: number
  saleFormula?: string
  paymentReceiverId: string
  paymentNote: string
  paymentReceived: boolean
  status: 'active' | 'completed'
  note: string
  createdAt: string
}

export interface HistoryEntry {
  id: string
  timestamp: string
  action: string
  description: string
  snapshot: { clients: Client[]; contractors: Contractor[]; payers: Payer[]; orders: Order[] }
  snapshotString?: string
}

export interface SalaryRecord {
  id: string
  month: string
  salaryPercent: number
  baseSalary: number
  payerAdjustments: { payerId: string; income: number; expense: number; net: number }[]
  totalAdjustment: number
  finalSalary: number
  paidAmount: number
  closedAt?: string
  note: string
  history: { timestamp: string; action: string; prevPaid: number; newPaid: number; note: string }[]
}

export type DashboardFilters = {
  status: 'all' | 'active' | 'completed'
  search: string
  month: string
  dateFrom: string
  dateTo: string
  sort: 'date_desc' | 'date_asc' | 'client' | 'amount'
}

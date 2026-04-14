export interface Client {
  id: string;
  name: string;
  phone: string;
  contactPerson: string;
  email: string;
  note: string;
  customFields: { label: string; value: string }[];
  createdAt: string;
}

export interface Contractor {
  id: string;
  name: string;
  phone: string;
  note: string;
  createdAt: string;
}

export interface Payer {
  id: string;
  name: string;
  createdAt: string;
}

export interface OrderContractorEntry {
  id: string;
  contractorId: string;
  description: string;
  costFormula: string;
  costValue: number;
  payerId: string;
  paid: boolean;
  reconciled: boolean;
  note: string;
}

export interface Order {
  id: string;
  date: string;
  clientId: string;
  productName: string;
  contractors: OrderContractorEntry[];
  saleAmount: number;
  paymentReceiverId: string;
  paymentNote: string;
  paymentReceived: boolean;
  status: 'active' | 'completed';
  note: string;
  createdAt: string;
}

export interface DashboardFilters {
  status: 'all' | 'active' | 'completed';
  dateFrom: string;
  dateTo: string;
  month: string;
  searchText: string;
  sortBy: 'date' | 'client' | 'amount';
  sortDir: 'asc' | 'desc';
}

export interface SalaryRecord {
  id: string;
  month: string;          // "YYYY-MM"
  salaryPercent: number;
  baseSalary: number;     // salary from profit
  payerAdjustments: {     // per-payer: income received - expenses paid = cash delta
    payerId: string;
    income: number;       // received from clients
    expense: number;      // paid to contractors
    net: number;          // income - expense (positive = should deposit to cash)
  }[];
  totalAdjustment: number; // sum of all net adjustments
  finalSalary: number;    // baseSalary - totalAdjustment (if payer owes money) or + (if owed)
  paidAmount: number;     // actually paid out
  closedAt: string | null; // ISO string when closed, null = open
  note: string;
  history: {              // audit trail for this salary record
    timestamp: string;
    action: string;
    prevPaid: number;
    newPaid: number;
    note: string;
  }[];
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  action: string;
  description: string;
  snapshot: {
    clients: Client[];
    contractors: Contractor[];
    payers: Payer[];
    orders: Order[];
  };
}

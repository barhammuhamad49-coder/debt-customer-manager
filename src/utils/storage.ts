import { Customer, CustomerIdConfig, DeletedCustomerRecord, StoreData, Transaction, TransactionType } from "../types";
import { INITIAL_CUSTOMERS, INITIAL_TRANSACTIONS } from "../data/initialData";

const STORE_KEY = "dukan-ledger-v1";

export const DEFAULT_CUSTOMER_ID_CONFIG: CustomerIdConfig = {
  enabled: true,
  prefix: "C-",
  startingNumber: 1,
};

export function formatCustomerId(num: number, prefix: string = "C-"): string {
  const cleanPrefix = prefix ?? "C-";
  const padded = String(Math.max(1, num)).padStart(4, "0");
  return `${cleanPrefix}${padded}`;
}

export function generateNextCustomerId(
  existingCustomers: Customer[] = [],
  deletedCustomers: DeletedCustomerRecord[] = [],
  config: CustomerIdConfig = DEFAULT_CUSTOMER_ID_CONFIG
): { newCode: string; updatedConfig: CustomerIdConfig } {
  const prefix = config.prefix ?? "C-";
  let currentNum = Math.max(1, config.startingNumber || 1);

  const usedCodes = new Set<string>();
  existingCustomers.forEach((c) => {
    if (c.code) usedCodes.add(c.code.trim().toLowerCase());
  });
  deletedCustomers.forEach((d) => {
    if (d.customer?.code) usedCodes.add(d.customer.code.trim().toLowerCase());
  });

  let candidate = "";
  while (true) {
    candidate = formatCustomerId(currentNum, prefix);
    if (!usedCodes.has(candidate.toLowerCase())) {
      break;
    }
    currentNum++;
  }

  return {
    newCode: candidate,
    updatedConfig: {
      ...config,
      startingNumber: currentNum + 1,
    },
  };
}

export function isCustomerIdDuplicate(
  codeToCheck: string,
  currentCustomerId: string | null = null,
  existingCustomers: Customer[] = [],
  deletedCustomers: DeletedCustomerRecord[] = []
): boolean {
  if (!codeToCheck || !codeToCheck.trim()) return false;
  const target = codeToCheck.trim().toLowerCase();

  const activeMatch = existingCustomers.some(
    (c) => c.id !== currentCustomerId && c.code && c.code.trim().toLowerCase() === target
  );
  if (activeMatch) return true;

  const deletedMatch = deletedCustomers.some(
    (d) => d.customer && d.customer.id !== currentCustomerId && d.customer.code && d.customer.code.trim().toLowerCase() === target
  );
  if (deletedMatch) return true;

  return false;
}



export function ensureCustomersHaveIds(data: StoreData): StoreData {
  const config = data.customerIdConfig || DEFAULT_CUSTOMER_ID_CONFIG;
  const existingCustomers = data.customers || [];
  const deletedCustomers = data.deletedCustomers || [];

  let nextConfig = { ...config };
  let modified = false;

  const updatedCustomers = existingCustomers.map((customer) => {
    if (!customer.code || !customer.code.trim()) {
      modified = true;
      const { newCode, updatedConfig } = generateNextCustomerId(existingCustomers, deletedCustomers, nextConfig);
      nextConfig = updatedConfig;
      return { ...customer, code: newCode };
    }
    return customer;
  });

  return {
    ...data,
    customers: updatedCustomers,
    customerIdConfig: nextConfig,
  };
}

export async function loadData(): Promise<StoreData> {
  let loaded: StoreData | null = null;
  try {
    // Check window.storage first if available
    if (typeof window !== "undefined" && (window as any).storage && typeof (window as any).storage.get === "function") {
      const res = await (window as any).storage.get(STORE_KEY, false);
      if (res && res.value) {
        const parsed = JSON.parse(res.value);
        loaded = {
          customers: parsed.customers || [],
          transactions: parsed.transactions || [],
          lastUserId: parsed.lastUserId || null,
          savedItems: parsed.savedItems || ["مریشک", "کارەبایی", "پیاواز", "مەریوان", "بەرهەم"],
          dailyRequests: parsed.dailyRequests || [],
          deletedCustomers: parsed.deletedCustomers || [],
          deletedTransactions: parsed.deletedTransactions || [],
          overdueThresholdDays: parsed.overdueThresholdDays || 30,
          customerIdConfig: parsed.customerIdConfig || DEFAULT_CUSTOMER_ID_CONFIG,
        };
      }
    }

    // Fallback to localStorage
    if (!loaded && typeof localStorage !== "undefined") {
      const local = localStorage.getItem(STORE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        loaded = {
          customers: parsed.customers || [],
          transactions: parsed.transactions || [],
          lastUserId: parsed.lastUserId || null,
          savedItems: parsed.savedItems || ["مریشک", "کارەبایی", "پیاواز", "مەریوان", "بەرهەم"],
          dailyRequests: parsed.dailyRequests || [],
          deletedCustomers: parsed.deletedCustomers || [],
          deletedTransactions: parsed.deletedTransactions || [],
          overdueThresholdDays: parsed.overdueThresholdDays || 30,
          customerIdConfig: parsed.customerIdConfig || DEFAULT_CUSTOMER_ID_CONFIG,
        };
      }
    }
  } catch (e) {
    console.error("Error loading ledger data:", e);
  }

  if (!loaded) {
    loaded = {
      customers: INITIAL_CUSTOMERS,
      transactions: INITIAL_TRANSACTIONS,
      lastUserId: "u1",
      savedItems: ["مریشک", "کارەبایی", "پیاواز", "مەریوان", "بەرهەم"],
      dailyRequests: [
        {
          id: "dr1",
          requestName: "مریشک ژمارە ١٢",
          quantity: "٥ دانە",
          customerId: "c1",
          customerName: "هەڵکەوت کەریم",
          date: todayISO(),
          status: "pending",
          note: "گەیاندن بۆ دووکان",
          createdAt: new Date().toISOString(),
        },
        {
          id: "dr2",
          requestName: "کارەبایی - وایەر",
          quantity: "٢ بەستە",
          customerId: "c2",
          customerName: "فەرهاد عومەر",
          date: todayISO(),
          status: "completed",
          note: "تەواوکراوە",
          createdAt: new Date().toISOString(),
        },
      ],
      customerIdConfig: DEFAULT_CUSTOMER_ID_CONFIG,
    };
  }

  return ensureCustomersHaveIds(loaded);
}

export async function saveData(data: StoreData): Promise<void> {
  try {
    const jsonString = JSON.stringify(data);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORE_KEY, jsonString);
    }
    if (typeof window !== "undefined" && (window as any).storage && typeof (window as any).storage.set === "function") {
      await (window as any).storage.set(STORE_KEY, jsonString, false);
    }
  } catch (e) {
    console.error("Storage error:", e);
  }
}

export function formatMoney(n: number): string {
  const v = Math.round(n);
  return v.toLocaleString("en-US") + " د.ع";
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const months = [
    "کانوونی دووەم",
    "شوبات",
    "ئازار",
    "ئایار",
    "حوزەیران",
    "تەمووز",
    "ئاب",
    "ئەیلوول",
    "تشرینی یەکەم",
    "تشرینی دووەم",
    "کانوونی دووەم"
  ];
  return `${d.getDate()}ی ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function daysAgo(iso: string): number {
  if (!iso) return 0;
  const then = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

// Check if transaction is a debt-like charge
export function isDebtType(type: TransactionType): boolean {
  return type === "general_debt" || type === "daily_debt" || type === "daily_receivable" || type === "debt";
}

// Helper to check if a transaction belongs to a customer by id or code
export function isTransactionForCustomer(
  t: Transaction,
  customerId: string,
  customerCode?: string
): boolean {
  if (!t || !t.customerId) return false;
  const tId = String(t.customerId).trim().toLowerCase();
  const cId = String(customerId || "").trim().toLowerCase();
  const cCode = customerCode ? String(customerCode).trim().toLowerCase() : "";
  return tId === cId || (cCode !== "" && tId === cCode);
}

// Get customer balance: Total Charges - Total Payments
export function calculateCustomerBalance(customerId: string, transactions: Transaction[], customerCode?: string): number {
  return transactions
    .filter((t) => isTransactionForCustomer(t, customerId, customerCode))
    .reduce((sum, t) => {
      if (t.type === "payment") {
        return sum - t.amount;
      }
      // general_debt, daily_debt, daily_receivable, or legacy debt
      return sum + t.amount;
    }, 0);
}

// Calculate breakdown totals
export function calculateTotals(transactions: Transaction[]) {
  let generalDebt = 0;
  let dailyDebt = 0;
  let dailyReceivable = 0;
  let totalPayments = 0;

  transactions.forEach((t) => {
    if (t.type === "general_debt" || t.type === "debt") {
      generalDebt += t.amount;
    } else if (t.type === "daily_debt") {
      dailyDebt += t.amount;
    } else if (t.type === "daily_receivable") {
      dailyReceivable += t.amount;
    } else if (t.type === "payment") {
      totalPayments += t.amount;
    }
  });

  const remainingBalance = (generalDebt + dailyDebt + dailyReceivable) - totalPayments;

  return {
    generalDebt,
    dailyDebt,
    dailyReceivable,
    totalPayments,
    remainingBalance,
  };
}

export function getTransactionTypeLabel(type: TransactionType): string {
  switch (type) {
    case "general_debt":
    case "debt":
      return "قەرزی گشتی";
    case "daily_debt":
      return "قەرزی کاتی";
    case "daily_receivable":
      return "داواکاری ڕۆژانە";
    case "payment":
      return "قەرز وەرگرتن / دانەوە";
    default:
      return "مامەڵە";
  }
}

export function getLastActivityDate(customerId: string, transactions: Transaction[], customerCode?: string): string | null {
  const items = transactions.filter((t) => isTransactionForCustomer(t, customerId, customerCode));
  if (items.length === 0) return null;
  return items.reduce((latest, t) => (t.date > latest ? t.date : latest), items[0].date);
}

export function generateUID(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface OverdueInfo {
  isOverdue: boolean;
  balance: number;
  overdueDays: number;
  oldestDebtDate: string | null;
}

export function getOverdueInfo(
  customerId: string,
  transactions: Transaction[],
  thresholdDays: number = 30,
  customerCode?: string
): OverdueInfo {
  const balance = calculateCustomerBalance(customerId, transactions, customerCode);
  if (balance <= 0) {
    return { isOverdue: false, balance, overdueDays: 0, oldestDebtDate: null };
  }

  // Find debt-type transactions
  const customerTxs = transactions.filter((t) => isTransactionForCustomer(t, customerId, customerCode) && isDebtType(t.type));
  if (customerTxs.length === 0) {
    return { isOverdue: false, balance, overdueDays: 0, oldestDebtDate: null };
  }

  // Sort by date ascending to find the oldest debt date
  const oldestDebtDate = customerTxs.reduce((oldest, t) => (t.date < oldest ? t.date : oldest), customerTxs[0].date);
  const days = daysAgo(oldestDebtDate);

  return {
    isOverdue: days >= thresholdDays,
    balance,
    overdueDays: days,
    oldestDebtDate,
  };
}

// --- DRAFT TRANSACTION RECOVERY STORAGE SYSTEM ---
export interface DraftTransaction {
  customerId: string;
  type: TransactionType;
  amount: string;
  category?: string;
  date: string;
  note: string;
  updatedAt: number;
}

const DRAFT_TX_KEY = "dukan_draft_transaction_v1";

export function saveDraftTransaction(draft: Omit<DraftTransaction, "updatedAt">): void {
  try {
    if (typeof localStorage === "undefined") return;
    // Only save if there is actually some draft input
    if (!draft.customerId && !draft.amount && !draft.note) {
      localStorage.removeItem(DRAFT_TX_KEY);
      return;
    }
    const data: DraftTransaction = {
      ...draft,
      updatedAt: Date.now(),
    };
    localStorage.setItem(DRAFT_TX_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save draft transaction:", e);
  }
}

export function loadDraftTransaction(): DraftTransaction | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const item = localStorage.getItem(DRAFT_TX_KEY);
    if (!item) return null;
    const parsed = JSON.parse(item) as DraftTransaction;
    if (parsed && (parsed.amount || parsed.note || parsed.customerId)) {
      return parsed;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function clearDraftTransaction(): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(DRAFT_TX_KEY);
    }
  } catch (e) {
    // ignore
  }
}

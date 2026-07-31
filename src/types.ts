export type UserRole = "سەرەکی" | "یاریدەدەر";

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  color: string;
  initial: string;
}

// Transaction Types:
// general_debt = قەرزی گشتی
// daily_debt = قەرزی ڕۆژانە
// daily_receivable = داواکاری ڕۆژانە
// payment = قەرز وەرگرتن / دانەوە
// debt = legacy debt (treated as general_debt)
export type TransactionType = "general_debt" | "daily_debt" | "daily_receivable" | "payment" | "debt";

export type ItemCategory = "chicken" | "electrical" | "other" | "daily_debt" | "general_debt" | string;

export interface CategoryInfo {
  key: ItemCategory;
  label: string;
  color: string;
}

export interface Transaction {
  id: string;
  customerId: string;
  type: TransactionType;
  amount: number;
  date: string; // ISO format YYYY-MM-DD
  category?: ItemCategory;
  note?: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string; // timestamp ISO
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  code?: string; // ژمارە یان کۆدی تایبەتی خاوەن قەرز (ئارەزوومەندانە)
  address?: string;
  notes?: string;
  createdAt: string;
  visitDays?: string[]; // هەڵبژاردنی ڕۆژانی سەردانی هەفتانە (پێنجشەممە، هەینی، ...)
}

export interface DailyRequest {
  id: string;
  requestName: string;
  quantity: string | number;
  customerId: string;
  customerName?: string;
  date: string; // ISO format YYYY-MM-DD
  status: "pending" | "completed";
  note?: string;
  createdByUserId?: string;
  createdByName?: string;
  createdAt: string;
}

export interface DeletedCustomerRecord {
  customer: Customer;
  transactions: Transaction[];
  deletedAt: string; // ISO timestamp
  deletedBy?: string;
}

export interface DeletedTransactionRecord {
  transaction: Transaction;
  customerName?: string;
  deletedAt: string; // ISO timestamp
  deletedBy?: string;
}

export interface CustomerIdConfig {
  enabled: boolean;          // چالاککردن / ناچالاککردنی سیستەمی Customer ID
  prefix: string;           // پێشگر (وەک C-)
  startingNumber: number;   // ژمارەی دەستپێکردن
}

export interface StoreData {
  customers: Customer[];
  transactions: Transaction[];
  lastUserId: string | null;
  savedItems?: string[]; // Autocomplete saved item/customer/request names
  dailyRequests?: DailyRequest[]; // Dedicated daily requests collection
  deletedCustomers?: DeletedCustomerRecord[];
  deletedTransactions?: DeletedTransactionRecord[];
  overdueThresholdDays?: number;
  customerIdConfig?: CustomerIdConfig;
}

import React, { useState, useMemo } from "react";
import {
  X,
  Plus,
  Phone,
  Printer,
  Trash2,
  Edit3,
  Utensils,
  Zap,
  Package,
  ArrowDownLeft,
  Clock,
  AlertCircle,
  Bell,
  LayoutGrid,
  Table,
  Calendar,
  Wallet,
  FileText,
  FileSpreadsheet,
  Search,
  Copy,
  Check,
  MapPin,
  UserCheck,
  Eye,
  Banknote,
  Share2,
  ChevronDown,
  Menu,
  PieChart,
  ArrowRight
} from "lucide-react";
import {
  Customer,
  Transaction,
  ItemCategory,
  UserProfile,
  TransactionType,
  DeletedTransactionRecord,
  DeletedCustomerRecord
} from "../types";
import {
  calculateCustomerBalance,
  formatDate,
  formatMoney,
  getOverdueInfo,
  isCustomerIdDuplicate,
  isTransactionForCustomer,
  todayISO
} from "../utils/storage";
import {
  exportToExcel,
  printOrPdfReport,
  copyReportToClipboard,
  prepareExportRows
} from "../utils/exportUtils";

interface CustomerDetailModalProps {
  customer: Customer | null;
  transactions: Transaction[];
  deletedTransactions?: DeletedTransactionRecord[];
  allCustomers?: Customer[];
  deletedCustomers?: DeletedCustomerRecord[];
  activeUser: UserProfile;
  overdueThresholdDays?: number;
  onClose: () => void;
  onOpenAddTransaction: (customerId: string, defaultType: TransactionType) => void;
  onDeleteTransaction: (transactionId: string) => void;
  onRestoreTransaction?: (transactionId: string) => void;
  onDeleteCustomer: (customerId: string) => void;
  onOpenReceipt: (transaction: Transaction, customer: Customer) => void;
  onOpenSendReminder?: (customer: Customer, balance: number, overdueDays: number) => void;
  onOpenExportReport?: (customerId?: string) => void;
  onUpdateCustomer?: (updatedCustomer: Customer) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  transactions,
  deletedTransactions = [],
  allCustomers = [],
  deletedCustomers = [],
  activeUser,
  overdueThresholdDays = 30,
  onClose,
  onOpenAddTransaction,
  onDeleteTransaction,
  onRestoreTransaction,
  onDeleteCustomer,
  onOpenReceipt,
  onOpenSendReminder,
  onOpenExportReport,
  onUpdateCustomer,
}) => {
  const [showConfirmDeleteCust, setShowConfirmDeleteCust] = useState(false);
  const [viewTab, setViewTab] = useState<"table" | "card">("table");
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedReportToast, setCopiedReportToast] = useState(false);

  // Filters state inside modal toolbar
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Pagination states for General Debt table & Payments table
  const [debtPage, setDebtPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const itemsPerPage = 10;

  // Edit Form States
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const customerId = customer?.id;
  const customerCode = customer?.code;

  // Filtered customer transactions
  const customerTx = useMemo(() => {
    if (!customerId) return [];
    return transactions
      .filter((t) => isTransactionForCustomer(t, customerId, customerCode))
      .sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        const validA = isNaN(timeA) ? 0 : timeA;
        const validB = isNaN(timeB) ? 0 : timeB;
        return validB - validA;
      });
  }, [transactions, customerId, customerCode]);

  // Filtered active transactions by search/category/user
  const filteredActiveTx = useMemo(() => {
    return customerTx.filter((tx) => {
      // Category filter
      if (categoryFilter !== "all" && tx.category !== categoryFilter) return false;
      // User filter
      if (userFilter !== "all" && tx.createdByUserId !== userFilter && tx.createdByName !== userFilter) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const noteMatch = tx.note?.toLowerCase().includes(q);
        const amountMatch = tx.amount.toString().includes(q);
        const dateMatch = tx.date?.includes(q);
        const userMatch = tx.createdByName?.toLowerCase().includes(q);
        if (!noteMatch && !amountMatch && !dateMatch && !userMatch) return false;
      }
      return true;
    });
  }, [customerTx, categoryFilter, userFilter, searchQuery]);

  // Separate debt vs payment list
  const debtTxList = useMemo(() => filteredActiveTx.filter((t) => t.type !== "payment"), [filteredActiveTx]);
  const paymentTxList = useMemo(() => filteredActiveTx.filter((t) => t.type === "payment"), [filteredActiveTx]);

  // Calculate running balance after each transaction (chronological order)
  const runningBalanceMap = useMemo(() => {
    const map = new Map<string, number>();
    const oldestFirst = [...customerTx].sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
    });
    let running = 0;
    oldestFirst.forEach((t) => {
      if (t.type === "payment") {
        running -= t.amount;
      } else {
        running += t.amount;
      }
      map.set(t.id, running);
    });
    return map;
  }, [customerTx]);

  // Unique users list for filter dropdown
  const uniqueUsers = useMemo(() => {
    const usersSet = new Set<string>();
    customerTx.forEach((t) => {
      if (t.createdByName) usersSet.add(t.createdByName);
    });
    return Array.from(usersSet);
  }, [customerTx]);

  if (!customer) return null;

  const balance = calculateCustomerBalance(customer.id, transactions, customer.code);
  const totalDebtsAdded = customerTx
    .filter((t) => t.type !== "payment")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalPaymentsMade = customerTx
    .filter((t) => t.type === "payment")
    .reduce((sum, t) => sum + t.amount, 0);

  const overdueInfo = getOverdueInfo(customer.id, transactions, overdueThresholdDays, customer.code);
  const lastTx = customerTx.length > 0 ? customerTx[0] : null;

  const handleStartEditing = () => {
    setEditName(customer.name);
    setEditPhone(customer.phone || "");
    setEditCode(customer.code || "");
    setEditAddress(customer.address || "");
    setEditNotes(customer.notes || "");
    setEditErrorMsg(null);
    setIsEditingInfo(true);
  };

  const handleSaveEditedInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setEditErrorMsg(null);
    if (!editName.trim()) return;

    const newCodeTrimmed = editCode.trim();
    if (newCodeTrimmed) {
      const isDuplicate = isCustomerIdDuplicate(newCodeTrimmed, customer.id, allCustomers, deletedCustomers);
      if (isDuplicate) {
        setEditErrorMsg(`ئەم Customer ID یە (${newCodeTrimmed}) پێشتر بۆ کڕیارێکی تر بەکار هاتووە!`);
        return;
      }
    }

    if (onUpdateCustomer) {
      onUpdateCustomer({
        ...customer,
        name: editName.trim(),
        phone: editPhone.trim(),
        code: newCodeTrimmed || undefined,
        address: editAddress.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });
    }
    setIsEditingInfo(false);
  };

  const handleCopyId = () => {
    const codeStr = customer.code || customer.id;
    navigator.clipboard.writeText(codeStr);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Helper for category pill badge matching reference image
  const getCategoryBadgeLabel = (cat?: ItemCategory, note?: string) => {
    if (note && (note.includes("برنج") || note.includes("شەکر") || note.includes("خواردن"))) {
      return note;
    }
    if (cat === "chicken") return "مریشک";
    if (cat === "electrical") return "کارەبایی";
    if ((cat as string) === "rice") return "برنج";
    if ((cat as string) === "sugar") return "شەکر";
    return note || "خواردن";
  };

  const handleExportPdf = () => {
    const rows = prepareExportRows(filteredActiveTx, allCustomers && allCustomers.length > 0 ? allCustomers : [customer]);
    printOrPdfReport(
      `ڕاپۆرتی قەرزی (${customer.name})`,
      `کۆی ڕاپۆرتی مامەڵەکانی کڕیار`,
      rows,
      { totalDebt: totalDebtsAdded, totalPayments: totalPaymentsMade, netBalance: balance },
      "دەفتەری دیجیتالی دووکان"
    );
  };

  const handleExportExcel = () => {
    const rows = prepareExportRows(filteredActiveTx, allCustomers && allCustomers.length > 0 ? allCustomers : [customer]);
    exportToExcel(
      `ڕاپۆرتی قەرزی (${customer.name})`,
      rows,
      `${customer.name.replace(/\s+/g, "_")}_${todayISO()}`,
      { totalDebt: totalDebtsAdded, totalPayments: totalPaymentsMade, netBalance: balance }
    );
  };

  const handlePrintReport = () => {
    handleExportPdf();
  };

  const handleCopyReport = async () => {
    const rows = prepareExportRows(filteredActiveTx, allCustomers && allCustomers.length > 0 ? allCustomers : [customer]);
    const ok = await copyReportToClipboard(
      `ڕاپۆرتی قەرزی (${customer.name})`,
      customer.name,
      { totalDebt: totalDebtsAdded, totalPayments: totalPaymentsMade, netBalance: balance },
      rows
    );
    if (ok) {
      setCopiedReportToast(true);
      setTimeout(() => setCopiedReportToast(false), 2500);
    }
  };

  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-[#F8FAFC] flex flex-col w-full h-full overflow-y-auto animate-in fade-in duration-200">
      
      <div className="bg-[#F8FAFC] min-h-screen w-full flex flex-col">
        
        {/* TOP CYAN HEADER BAR (Matching Reference Image) */}
        <div className="bg-[#0096A6] text-white px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-20 no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-xl transition flex items-center gap-1.5 text-white font-bold"
              title="گەڕانەوە بۆ پەڕەی سەرەکی"
            >
              <ArrowRight className="w-5 h-5 text-white" />
              <span className="text-xs sm:text-sm font-bold font-display hidden sm:inline">داخستن / سەرەکی</span>
            </button>
            <h2 className="text-base sm:text-lg font-black font-display text-white tracking-wide flex items-center gap-2">
              <span>مامەڵەکانی کڕیار</span>
            </h2>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button className="p-1.5 hover:bg-white/10 rounded-xl transition text-white">
              <Search className="w-5 h-5" />
            </button>

            <div className="relative">
              <button className="p-1.5 hover:bg-white/10 rounded-xl transition text-white">
                <Bell className="w-5 h-5" />
              </button>
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-[#0096A6]">
                3
              </span>
            </div>

            {/* User Profile Chip */}
            <div className="flex items-center gap-2 pr-2 sm:pr-3 border-r border-teal-500/50">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 border-2 border-white/60 overflow-hidden flex items-center justify-center font-bold text-white text-xs sm:text-sm">
                {activeUser.avatar ? (
                  <img src={activeUser.avatar} alt="User" className="w-full h-full object-cover" />
                ) : (
                  activeUser.name.slice(0, 1)
                )}
              </div>
              <div className="text-right text-xs hidden sm:block">
                <div className="font-extrabold text-white leading-tight">{activeUser.name || "مەریوان محمد"}</div>
                <div className="text-[10px] text-teal-100 font-medium">{activeUser.role === "admin" ? "بەڕێوەبەر" : "بەکارهێنەر"}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-teal-100 hidden sm:block" />
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-white/90 hover:text-white hover:bg-white/20 rounded-xl transition"
              title="داخستن"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* MODAL BODY CONTAINER */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-[#F8FAFC]">
          
          {/* ========================================================= */}
          {/* 1. TOP CUSTOMER PROFILE CARD WITH 6 METRIC BLOCKS        */}
          {/* ========================================================= */}
          <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-xs p-4 sm:p-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              
              {/* BLOCK 1: CUSTOMER PROFILE DETAILS (Cols 4) */}
              <div className="lg:col-span-4 flex items-center gap-4 pl-4 lg:border-l border-slate-200/80">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-200 border-2 border-slate-300 overflow-hidden flex items-center justify-center font-black text-slate-700 text-2xl shadow-inner">
                    {customer.avatar ? (
                      <img src={customer.avatar} alt={customer.name} className="w-full h-full object-cover" />
                    ) : (
                      customer.name.slice(0, 1)
                    )}
                  </div>
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-black font-display text-slate-900">
                      {customer.name}
                    </h1>
                    <span className="bg-[#0096A6] text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                      VIP
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                    <span>ID: {customer.code || customer.id || "CUS-1001"}</span>
                    <button onClick={handleCopyId} title="کۆپیکردن">
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />}
                    </button>
                  </div>

                  <div className="text-xs text-slate-600 space-y-0.5 font-medium">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono dir-ltr">{customer.phone || "0750 841 5775"}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{customer.address || "سلێمانی - گەڕەکی سەروەشت"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* STAT CARDS (Cols 8) - 5 METRIC BLOCKS (Matching screenshot order RTL) */}
              <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                
                {/* 1. ژمارەی مامەڵەکان (Total Transaction Count) */}
                <div className="flex items-center gap-2.5 p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-slate-500 truncate">ژمارەی مامەڵەکان</div>
                    <div className="text-sm sm:text-base font-black text-slate-900 font-mono leading-tight">
                      {customerTx.length || 12}
                    </div>
                    <div className="text-[10px] text-slate-400">مامەڵە</div>
                  </div>
                </div>

                {/* 2. دواین مامەڵە (Last Transaction) */}
                <div className="flex items-center gap-2.5 p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-slate-500 truncate">دواین مامەڵە</div>
                    <div className="text-xs font-black text-slate-800 font-mono leading-tight">
                      {lastTx ? formatDate(lastTx.date) : "2026-07-28"}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{lastTx?.time || "18:04"}</div>
                  </div>
                </div>

                {/* 3. ماوەی قەرز (Debt Duration / Days) */}
                <div className="flex items-center gap-2.5 p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-slate-500 truncate">ماوەی قەرز</div>
                    <div className="text-sm sm:text-base font-black text-amber-600 font-mono leading-tight">
                      {overdueInfo.overdueDays || 35}
                    </div>
                    <div className="text-[10px] text-slate-400">ڕۆژ</div>
                  </div>
                </div>

                {/* 4. پارەی واصل (Total Payments) */}
                <div className="flex items-center gap-2.5 p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-slate-500 truncate">پارەی واصل</div>
                    <div className="text-sm sm:text-base font-black text-emerald-600 font-mono leading-tight">
                      {formatMoney(totalPaymentsMade)}
                    </div>
                    <div className="text-[10px] text-slate-400">دینار</div>
                  </div>
                </div>

                {/* 5. قەرزی گشتی (General Debt) */}
                <div className="flex items-center gap-2.5 p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-slate-500 truncate">قەرزی گشتی</div>
                    <div className="text-sm sm:text-base font-black text-purple-600 font-mono leading-tight">
                      {formatMoney(totalDebtsAdded)}
                    </div>
                    <div className="text-[10px] text-slate-400">دینار</div>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* EDIT FORM (Hidden by default unless edit clicked) */}
          {isEditingInfo && (
            <div className="bg-amber-50 border border-amber-300 rounded-[20px] p-4 no-print shadow-xs">
              <form onSubmit={handleSaveEditedInfo} className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                  <h4 className="font-extrabold text-amber-950 text-xs flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-amber-700" />
                    <span>دەستکاریکردنی زانیاری کڕیار</span>
                  </h4>
                  <button type="button" onClick={() => setIsEditingInfo(false)} className="text-amber-800 text-xs font-bold">
                    پاشگەزبوونەوە
                  </button>
                </div>

                {editErrorMsg && (
                  <div className="p-2 bg-red-100 text-red-900 rounded-xl text-xs font-bold">
                    {editErrorMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">ناوی کڕیار</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">ژمارەی مۆبایل</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono dir-ltr text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">کۆدی کڕیار</label>
                    <input
                      type="text"
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono dir-ltr text-right"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button type="submit" className="px-4 py-1.5 bg-[#0096A6] text-white rounded-xl text-xs font-bold">
                    پاشەکەوتکردن
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. FILTER CONTROLS TOOLBAR (Exact layout from reference)  */}
          {/* ========================================================= */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 no-print">
            
            {/* Table / Card View Mode Pill & Export Action Buttons */}
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <button
                type="button"
                onClick={() => setViewTab("table")}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
                  viewTab === "table"
                    ? "bg-[#0096A6] text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Table className="w-4 h-4" />
                <span>Table View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewTab("card")}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
                  viewTab === "card"
                    ? "bg-[#0096A6] text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Card View</span>
              </button>

              {/* Export Buttons: PDF, Excel, Print, Copy */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition active:scale-95"
                  title="Export to PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition active:scale-95"
                  title="Export to Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition active:scale-95"
                  title="Print Report"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition active:scale-95"
                  title="Copy Report"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedReportToast ? "کۆپی کرا! ✅" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Filter Dropdowns & Search Box */}
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
              
              {/* Date Filter Dropdown */}
              <div className="relative">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="appearance-none pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer shadow-xs"
                >
                  <option value="all">📅 2026-07-01 - 2026-07-31</option>
                  <option value="today">ئەمڕۆ</option>
                  <option value="month">ئەم مانگە</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-3 pointer-events-none" />
              </div>

              {/* Category Filter Dropdown */}
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="appearance-none pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer shadow-xs"
                >
                  <option value="all">هەموو جۆرەکان</option>
                  <option value="chicken">مریشک</option>
                  <option value="electrical">کارەبایی</option>
                  <option value="rice">برنج</option>
                  <option value="sugar">شەکر</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-3 pointer-events-none" />
              </div>

              {/* User Filter Dropdown */}
              <div className="relative">
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="appearance-none pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer shadow-xs"
                >
                  <option value="all">هەموو بەکارهێنەران</option>
                  {uniqueUsers.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-3 pointer-events-none" />
              </div>

              {/* Search Box */}
              <div className="relative flex-1 sm:w-48">
                <input
                  type="text"
                  placeholder="گەڕان..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-3 pl-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-xs"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>

              {/* Add Button */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="px-4 py-2 bg-[#0096A6] hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition active:scale-95"
                >
                  <span>زیاد کردن</span>
                  <Plus className="w-4 h-4" />
                </button>

                {/* Dropdown Menu */}
                {showAddMenu && (
                  <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-1.5 space-y-1 text-xs">
                    <button
                      onClick={() => {
                        setShowAddMenu(false);
                        onOpenAddTransaction(customer.id, "general_debt");
                      }}
                      className="w-full text-right px-3 py-2 text-rose-700 hover:bg-rose-50 font-bold rounded-xl flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-600" />
                      <span>قەرزی گشتی</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowAddMenu(false);
                        onOpenAddTransaction(customer.id, "daily_debt");
                      }}
                      className="w-full text-right px-3 py-2 text-amber-700 hover:bg-amber-50 font-bold rounded-xl flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-600" />
                      <span>قەرزی کاتی</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowAddMenu(false);
                        onOpenAddTransaction(customer.id, "payment");
                      }}
                      className="w-full text-right px-3 py-2 text-emerald-700 hover:bg-emerald-50 font-bold rounded-xl flex items-center gap-2 border-t border-slate-100"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span>تۆمارکردنی دانەوە</span>
                    </button>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* ========================================================= */}
          {/* 3. SECTION 1: GENERAL DEBT TABLE ("📒 قەرزی گشتی")         */}
          {/* ========================================================= */}
          {viewTab === "table" && (
            <div className="space-y-6">
              <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-xs overflow-hidden">
            
            {/* Table Section Header */}
            <div className="px-5 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                <h3 className="text-sm font-black font-display text-slate-900">
                  قەرزی گشتی
                </h3>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse min-w-[900px]">
                <thead className="bg-slate-50 text-slate-600 font-extrabold text-[11px] border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4 text-center w-12">#</th>
                    <th className="py-3 px-4">بابەت</th>
                    <th className="py-3 px-4 text-center">دانە</th>
                    <th className="py-3 px-4 text-center">نرخ</th>
                    <th className="py-3 px-4 text-center">کۆی گشتی نرخ</th>
                    <th className="py-3 px-4 text-center">بەروار</th>
                    <th className="py-3 px-4 text-center">کات</th>
                    <th className="py-3 px-4 text-center">بەکارهێنەر</th>
                    <th className="py-3 px-4 text-center">بالانس</th>
                    <th className="py-3 px-4 text-center w-32 no-print">کردار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {debtTxList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                        هیچ قەرزێک تۆمار نەکراوە.
                      </td>
                    </tr>
                  ) : (
                    debtTxList.map((tx, idx) => {
                      const afterBalance = runningBalanceMap.get(tx.id) ?? 0;
                      const catLabel = getCategoryBadgeLabel(tx.category, tx.note);
                      const qty = tx.quantity || 1;
                      const unitPrice = tx.unitPrice || (qty > 0 ? Math.round(tx.amount / qty) : tx.amount);
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-center font-mono text-slate-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="inline-block bg-sky-100/80 text-sky-800 text-[11px] font-extrabold px-3 py-1 rounded-full">
                              {catLabel}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-700 font-bold">
                            {qty}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-600 text-[11px]">
                            {formatMoney(unitPrice)}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-black text-red-600 text-sm dir-ltr">
                            {formatMoney(tx.amount)}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-600 text-[11px]">
                            {formatDate(tx.date)}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-500 text-[11px]">
                            {tx.time || "18:04"}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-700 text-xs font-bold">
                            {tx.createdByName || "مەریوان محمد"}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-black text-red-600 text-sm dir-ltr">
                            {formatMoney(afterBalance)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap no-print">
                            <div className="flex items-center justify-center gap-2">
                              {/* Eye icon */}
                              <button
                                onClick={() => onOpenReceipt(tx, customer)}
                                className="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-400 flex items-center justify-center shadow-2xs transition"
                                title="بینین"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {/* Print icon */}
                              <button
                                onClick={() => onOpenReceipt(tx, customer)}
                                className="w-7 h-7 rounded-full bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 flex items-center justify-center shadow-2xs transition"
                                title="چاپکردن"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              {/* Delete icon */}
                              <button
                                onClick={() => onDeleteTransaction(tx.id)}
                                className="w-7 h-7 rounded-full bg-white border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center shadow-2xs transition"
                                title="سڕینەوە"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <div>
                نیشان دانی 1 - {debtTxList.length} له {debtTxList.length}
              </div>

              {/* Pagination controls */}
              <div className="flex items-center gap-1 font-mono">
                <button className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-700">«</button>
                <button className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-700">‹</button>
                <button className="w-7 h-7 rounded-lg bg-[#0096A6] text-white font-bold flex items-center justify-center">1</button>
                <button className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center">2</button>
                <button className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center">3</button>
                <span className="px-1 text-slate-400">...</span>
                <button className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center">10</button>
                <button className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-700">›</button>
                <button className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-700">»</button>
              </div>

              <div className="flex items-center gap-1">
                <span>تۆمار هەر بەڕە</span>
                <select className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold">
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>

          </div>

          {/* ========================================================= */}
          {/* 4. SECTION 2: RECEIVED PAYMENTS TABLE ("پارەی واصل" Green Dot 🟢) */}
          {/* ========================================================= */}
          <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-xs overflow-hidden">
            
            {/* Table Section Header */}
            <div className="px-5 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-black font-display text-slate-900">
                  پارەی واصل
                </h3>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse min-w-[900px]">
                <thead className="bg-slate-50 text-slate-600 font-extrabold text-[11px] border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4 text-center w-12">#</th>
                    <th className="py-3 px-4 text-center">بڕ</th>
                    <th className="py-3 px-4 text-center">بەروار</th>
                    <th className="py-3 px-4 text-center">تێبینی</th>
                    <th className="py-3 px-4 text-center">بەکارهێنەر</th>
                    <th className="py-3 px-4 text-center w-32 no-print">کردار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paymentTxList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        هیچ پارەیەکی واصل نەکراوە.
                      </td>
                    </tr>
                  ) : (
                    paymentTxList.map((tx, idx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-slate-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-black text-emerald-600 text-sm dir-ltr">
                          {formatMoney(tx.amount)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-600 text-[11px]">
                          {formatDate(tx.date)}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-700 text-xs">
                          {tx.note || "پارەدان"}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-700 text-xs font-bold">
                          {tx.createdByName || "مەریوان محمد"}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap no-print">
                          <div className="flex items-center justify-center gap-2">
                            {/* Eye icon */}
                            <button
                              onClick={() => onOpenReceipt(tx, customer)}
                              className="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-400 flex items-center justify-center shadow-2xs transition"
                              title="بینین"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {/* Print icon */}
                            <button
                              onClick={() => onOpenReceipt(tx, customer)}
                              className="w-7 h-7 rounded-full bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 flex items-center justify-center shadow-2xs transition"
                              title="چاپکردن"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {/* Delete icon */}
                            <button
                              onClick={() => onDeleteTransaction(tx.id)}
                              className="w-7 h-7 rounded-full bg-white border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center shadow-2xs transition"
                              title="سڕینەوە"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <div>
                نیشان دانی 1 - {paymentTxList.length} له {paymentTxList.length}
              </div>

              {/* Pagination controls */}
              <div className="flex items-center gap-1 font-mono">
                <button className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-700">«</button>
                <button className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-700">‹</button>
                <button className="w-7 h-7 rounded-lg bg-[#0096A6] text-white font-bold flex items-center justify-center">1</button>
                <button className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center">3</button>
                <button className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center">10</button>
                <button className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-700">›</button>
                <button className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-700">»</button>
              </div>

              <div className="flex items-center gap-1">
                <span>تۆمار هەر بەڕە</span>
                <select className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold">
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>

          </div>
          </div>
          )}

          {/* ========================================================= */}
          {/* CARD VIEW MODE                                             */}
          {/* ========================================================= */}
          {viewTab === "card" && (
            <div className="space-y-4">
              {filteredActiveTx.length === 0 ? (
                <div className="bg-white rounded-[20px] border border-slate-200/80 p-10 text-center text-slate-400 text-xs">
                  هیچ مامەڵەیەک نەدۆزرایەوە.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredActiveTx.map((tx) => {
                    const afterBalance = runningBalanceMap.get(tx.id) ?? 0;
                    const isPayment = tx.type === "payment";
                    const catLabel = isPayment ? "پارەی واصل" : getCategoryBadgeLabel(tx.category, tx.note);
                    const qty = isPayment ? 1 : (tx.quantity || 1);
                    const unitPrice = tx.unitPrice || (qty > 0 ? Math.round(tx.amount / qty) : tx.amount);

                    return (
                      <div
                        key={tx.id}
                        className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-4.5 flex flex-col justify-between space-y-3.5"
                      >
                        {/* Card Header: Type Badge & Amount */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                              isPayment
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-rose-100 text-rose-800 border border-rose-200"
                            }`}
                          >
                            <span className="text-xs">{isPayment ? "🟢" : "🔴"}</span>
                            <span>{isPayment ? "پارەی واصل" : "قەرز"}</span>
                          </span>
                          <div className={`text-base font-black font-mono dir-ltr ${isPayment ? "text-emerald-600" : "text-rose-600"}`}>
                            {isPayment ? `- ${formatMoney(tx.amount)}` : `+ ${formatMoney(tx.amount)}`}
                          </div>
                        </div>

                        {/* Card Body: Info Fields */}
                        <div className="space-y-2 text-xs text-slate-700">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-bold">بابەت / کاڵا:</span>
                            <span className="font-extrabold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg">{catLabel}</span>
                          </div>

                          {!isPayment && qty > 1 && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-bold">دانە / نرخ:</span>
                              <span className="font-mono font-bold text-slate-800">
                                {qty} دانە × {formatMoney(unitPrice)}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-bold">بەروار و کات:</span>
                            <span className="font-mono text-slate-700 font-bold">
                              {formatDate(tx.date)} | {(tx as any).time || "18:04"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-bold">بەکارهێنەر:</span>
                            <span className="font-extrabold text-slate-800">{tx.createdByName || "مەریوان محمد"}</span>
                          </div>

                          {/* Remaining Debt after transaction */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 bg-slate-50/70 p-2.5 rounded-xl">
                            <span className="font-black text-slate-900">قەرزی ماوە دوای مامەڵە:</span>
                            <span className={`font-mono font-black text-sm dir-ltr ${afterBalance <= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {formatMoney(afterBalance)} IQD
                            </span>
                          </div>
                        </div>

                        {/* Card Footer: Action Buttons */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5 no-print">
                          <button
                            onClick={() => onOpenReceipt(tx, customer)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-xs flex items-center gap-1 shadow-2xs transition"
                            title="بینین"
                          >
                            <Eye className="w-3.5 h-3.5 text-teal-600" />
                            <span>بینین</span>
                          </button>
                          <button
                            onClick={() => onOpenReceipt(tx, customer)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-xs flex items-center gap-1 shadow-2xs transition"
                            title="دەستکاری"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                            <span>دەستکاری</span>
                          </button>
                          <button
                            onClick={() => onOpenReceipt(tx, customer)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold text-xs flex items-center gap-1 shadow-2xs transition"
                            title="چاپکردن"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-600" />
                            <span>چاپکردن</span>
                          </button>
                          <button
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-xs flex items-center gap-1 shadow-2xs transition"
                            title="سڕینەوە"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>سڕینەوە</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. BOTTOM SUMMARY CARDS ROW (3 Cards matching reference)  */}
          {/* ========================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: کۆی قەرز (Total Debt) */}
            <div className="bg-[#FFF5F5] border border-red-200/60 rounded-[20px] p-5 flex items-center gap-4 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-600">کۆی قەرز</div>
                <div className="text-xl font-black text-red-600 font-mono">
                  {formatMoney(totalDebtsAdded)} <span className="text-xs font-bold text-slate-500">دینار</span>
                </div>
              </div>
            </div>

            {/* Card 2: کۆی پارەی واصل (Total Payments) */}
            <div className="bg-[#F0FDF4] border border-emerald-200/60 rounded-[20px] p-5 flex items-center gap-4 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Banknote className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-600">کۆی پارەی واصل</div>
                <div className="text-xl font-black text-emerald-600 font-mono">
                  {formatMoney(totalPaymentsMade)} <span className="text-xs font-bold text-slate-500">دینار</span>
                </div>
              </div>
            </div>

            {/* Card 3: باڵانسی ئێستا (Current Balance) */}
            <div className="bg-[#FFF7ED] border border-amber-200/60 rounded-[20px] p-5 flex items-center gap-4 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <PieChart className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-600">باڵانسی ئێستا</div>
                <div className="text-xl font-black text-amber-600 font-mono">
                  {formatMoney(balance)} <span className="text-xs font-bold text-slate-500">دینار</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* CONFIRM DELETE CUSTOMER MODAL */}
      {showConfirmDeleteCust && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">سڕینەوەی کڕیار</h3>
            <p className="text-xs text-slate-600">
              ئایا دڵنیایت لە سڕینەوەی کڕیاری <b>{customer.name}</b>؟
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowConfirmDeleteCust(false)}
                className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                پاشگەزبوونەوە
              </button>
              <button
                onClick={() => {
                  onDeleteCustomer(customer.id);
                  setShowConfirmDeleteCust(false);
                  onClose();
                }}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl text-xs font-bold"
              >
                بەڵێ، بسڕەرەوە
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

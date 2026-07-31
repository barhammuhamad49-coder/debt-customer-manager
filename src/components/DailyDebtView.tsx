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
  Eye,
  Banknote,
  ChevronDown,
  PieChart,
  User,
  ShoppingBag
} from "lucide-react";
import {
  Customer,
  Transaction,
  ItemCategory,
  UserProfile,
  TransactionType
} from "../types";
import {
  calculateCustomerBalance,
  formatDate,
  formatMoney,
  getOverdueInfo,
  todayISO
} from "../utils/storage";
import {
  exportToExcel,
  printOrPdfReport,
  copyReportToClipboard,
  prepareExportRows
} from "../utils/exportUtils";

interface DailyDebtViewProps {
  customers: Customer[];
  transactions: Transaction[];
  activeUser: UserProfile;
  searchQuery?: string;
  overdueThresholdDays?: number;
  sectionTitle?: string;
  accentColor?: "orange" | "purple" | "emerald" | "amber";
  defaultTxType?: TransactionType;
  onSelectCustomer: (customer: Customer) => void;
  onOpenAddCustomer: () => void;
  onQuickAddDebt: (customer: Customer) => void;
  onQuickAddPayment: (customer: Customer) => void;
  onAddTransaction: (tx: Omit<Transaction, "id">) => void;
  onDeleteTransaction: (txId: string) => void;
  onOpenReceipt: (tx: Transaction, customer: Customer) => void;
  onOpenSendReminder?: (customer: Customer, balance: number, overdueDays: number) => void;
  onOpenExportReport?: (customerId?: string, sectionType?: "daily_debt" | "general_debt") => void;
}

export const DailyDebtView: React.FC<DailyDebtViewProps> = ({
  customers,
  transactions,
  activeUser,
  searchQuery: externalSearchQuery = "",
  overdueThresholdDays = 30,
  sectionTitle = "قەرزی کاتی",
  accentColor = "orange",
  defaultTxType = "daily_debt",
  onSelectCustomer,
  onOpenAddCustomer,
  onQuickAddDebt,
  onQuickAddPayment,
  onAddTransaction,
  onDeleteTransaction,
  onOpenReceipt,
  onOpenSendReminder,
  onOpenExportReport,
}) => {
  const isPurple = accentColor === "purple";
  const isGeneral = defaultTxType === "general_debt" || defaultTxType === "debt";

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery);

  // Sync prop externalSearchQuery if passed from App header
  React.useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  // Digits normalization
  const normalizeDigits = (str: string) =>
    str
      .replace(/[٠۰0]/g, "0")
      .replace(/[١۱1]/g, "1")
      .replace(/[٢۲2]/g, "2")
      .replace(/[٣۳3]/g, "3")
      .replace(/[٤۴4]/g, "4")
      .replace(/[٥۵5]/g, "5")
      .replace(/[٦۶6]/g, "6")
      .replace(/[٧۷7]/g, "7")
      .replace(/[٨۸8]/g, "8")
      .replace(/[٩۹9]/g, "9");

  // Filter customers by search query (Customer Name, Phone Number, Customer Code/ID)
  const filteredCustomers = useMemo(() => {
    const rawQuery = searchQuery.trim().toLowerCase();
    if (!rawQuery) return customers;

    const queryNorm = normalizeDigits(rawQuery);

    const matches = customers.filter((c) => {
      const matchesName = c.name ? c.name.toLowerCase().includes(rawQuery) : false;
      const matchesPhone = c.phone ? normalizeDigits(c.phone.toLowerCase()).includes(queryNorm) : false;
      const matchesCode = c.code ? normalizeDigits(c.code.toLowerCase()).includes(queryNorm) : false;
      const matchesId = c.id ? normalizeDigits(c.id.toLowerCase()).includes(queryNorm) : false;

      return matchesName || matchesPhone || matchesCode || matchesId;
    });

    return matches.length > 0 ? matches : customers;
  }, [customers, searchQuery]);

  // Selected Customer state (defaults to first customer or empty)
  const [selectedCustId, setSelectedCustId] = useState<string>(
    customers.length > 0 ? customers[0].id : ""
  );

  // Auto-switch selected customer when search matches a customer
  React.useEffect(() => {
    const rawQuery = searchQuery.trim().toLowerCase();
    if (!rawQuery) return;

    const queryNorm = normalizeDigits(rawQuery);
    const matched = customers.find((c) => {
      const matchesName = c.name ? c.name.toLowerCase().includes(rawQuery) : false;
      const matchesPhone = c.phone ? normalizeDigits(c.phone.toLowerCase()).includes(queryNorm) : false;
      const matchesCode = c.code ? normalizeDigits(c.code.toLowerCase()).includes(queryNorm) : false;
      const matchesId = c.id ? normalizeDigits(c.id.toLowerCase()).includes(queryNorm) : false;

      return matchesName || matchesPhone || matchesCode || matchesId;
    });

    if (matched) {
      setSelectedCustId(matched.id);
    }
  }, [searchQuery, customers]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustId) || customers[0] || null,
    [customers, selectedCustId]
  );

  // View mode tab: "table" vs "card"
  const [viewTab, setViewTab] = useState<"table" | "card">("table");

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Pagination states
  const [debtPage, setDebtPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [cardPage, setCardPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Quick Add Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalTxType, setModalTxType] = useState<TransactionType>(defaultTxType);
  const [modalCustId, setModalCustId] = useState<string>("");
  const [modalAmount, setModalAmount] = useState<string>("");
  const [modalNote, setModalNote] = useState<string>("");
  const [modalDate, setModalDate] = useState<string>(todayISO());
  const [copiedId, setCopiedId] = useState(false);

  // Styling theme mappings
  const themeHeaderBg = isPurple ? "bg-purple-800" : "bg-[#0096A6]";
  const themeBtnBg = isPurple ? "bg-purple-700 hover:bg-purple-800" : "bg-[#0096A6] hover:bg-teal-700";
  const themeAccentText = isPurple ? "text-purple-600" : "text-amber-500";
  const themeIconBg = isPurple ? "bg-purple-600" : "bg-amber-500";

  // Filter all relevant transactions for this page (General Debt vs Daily Debt)
  const pageTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (isGeneral) {
        return t.type === "general_debt" || t.type === "debt" || t.type === "payment";
      } else {
        return t.type === "daily_debt" || (t.type === "payment" && (t.note?.includes("ڕۆژانە") || t.category === "daily_debt"));
      }
    });
  }, [transactions, isGeneral]);

  // Active customer transactions
  const activeCustomerTx = useMemo(() => {
    if (!selectedCustomer) return pageTransactions;
    return pageTransactions.filter((t) => t.customerId === selectedCustomer.id || (selectedCustomer.code && t.customerCode === selectedCustomer.code));
  }, [pageTransactions, selectedCustomer]);

  // Filtered transactions by Search / Category / User / Date
  const filteredActiveTx = useMemo(() => {
    return activeCustomerTx.filter((tx) => {
      if (categoryFilter !== "all" && tx.category !== categoryFilter) return false;
      if (userFilter !== "all" && tx.createdByUserId !== userFilter && tx.createdByName !== userFilter) return false;
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
  }, [activeCustomerTx, categoryFilter, userFilter, searchQuery]);

  // Separate Debt transactions vs Payment transactions
  const debtTxList = useMemo(() => {
    return [...filteredActiveTx].sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      if (timeA !== timeB) return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
      return 0;
    });
  }, [filteredActiveTx]);

  const paymentTxList = useMemo(() => filteredActiveTx.filter((t) => t.type === "payment"), [filteredActiveTx]);

  // Paginated Debt transactions
  const paginatedDebtTx = useMemo(() => {
    const start = (debtPage - 1) * itemsPerPage;
    return debtTxList.slice(start, start + itemsPerPage);
  }, [debtTxList, debtPage, itemsPerPage]);

  // Paginated Payment transactions
  const paginatedPaymentTx = useMemo(() => {
    const start = (paymentPage - 1) * itemsPerPage;
    return paymentTxList.slice(start, start + itemsPerPage);
  }, [paymentTxList, paymentPage, itemsPerPage]);

  // Card view transactions (same dataset, sorted)
  const allCardTxList = useMemo(() => {
    return [...filteredActiveTx].sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      if (timeA !== timeB) return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      return 0;
    });
  }, [filteredActiveTx]);

  const paginatedCardTx = useMemo(() => {
    const start = (cardPage - 1) * itemsPerPage;
    return allCardTxList.slice(start, start + itemsPerPage);
  }, [allCardTxList, cardPage, itemsPerPage]);

  // Running balance map for Debt Table
  const runningBalanceMap = useMemo(() => {
    const map = new Map<string, number>();
    const oldestFirst = [...activeCustomerTx].sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      if (timeA !== timeB) return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
      return 0;
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
  }, [activeCustomerTx]);

  // Total metrics
  const totalDebtsAdded = useMemo(
    () => activeCustomerTx.filter((t) => t.type !== "payment").reduce((sum, t) => sum + t.amount, 0),
    [activeCustomerTx]
  );
  const totalPaymentsMade = useMemo(
    () => activeCustomerTx.filter((t) => t.type === "payment").reduce((sum, t) => sum + t.amount, 0),
    [activeCustomerTx]
  );
  const currentBalance = totalDebtsAdded - totalPaymentsMade;

  const overdueInfo = selectedCustomer
    ? getOverdueInfo(selectedCustomer.id, pageTransactions, overdueThresholdDays, selectedCustomer.code)
    : { overdueDays: 0, isOverdue: false };

  const lastTx = activeCustomerTx.length > 0 ? activeCustomerTx[0] : null;

  // Unique users list for filter dropdown
  const uniqueUsers = useMemo(() => {
    const usersSet = new Set<string>();
    activeCustomerTx.forEach((t) => {
      if (t.createdByName) usersSet.add(t.createdByName);
    });
    return Array.from(usersSet);
  }, [activeCustomerTx]);

  const [copiedReportToast, setCopiedReportToast] = useState(false);

  const handleExportPdf = () => {
    const rows = prepareExportRows(filteredActiveTx, customers);
    printOrPdfReport(
      selectedCustomer ? `ڕاپۆرتی قەرزی (${selectedCustomer.name})` : "ڕاپۆرتی گشتی قەرزەکان",
      `کۆی ڕاپۆرتی مامەڵەکان`,
      rows,
      { totalDebt: totalDebtsAdded, totalPayments: totalPaymentsMade, netBalance: currentBalance },
      "دەفتەری دیجیتالی دووکان"
    );
  };

  const handleExportExcel = () => {
    const rows = prepareExportRows(filteredActiveTx, customers);
    exportToExcel(
      selectedCustomer ? `ڕاپۆرتی قەرزی (${selectedCustomer.name})` : "ڕاپۆرتی گشتی قەرزەکان",
      rows,
      selectedCustomer ? `${selectedCustomer.name.replace(/\s+/g, "_")}_${todayISO()}` : `Raporta_Qerzakan_${todayISO()}`,
      { totalDebt: totalDebtsAdded, totalPayments: totalPaymentsMade, netBalance: currentBalance }
    );
  };

  const handlePrintReport = () => {
    handleExportPdf();
  };

  const handleCopyReport = async () => {
    const rows = prepareExportRows(filteredActiveTx, customers);
    const ok = await copyReportToClipboard(
      selectedCustomer ? `ڕاپۆرتی قەرزی (${selectedCustomer.name})` : "ڕاپۆرتی گشتی قەرزەکان",
      selectedCustomer ? selectedCustomer.name : null,
      { totalDebt: totalDebtsAdded, totalPayments: totalPaymentsMade, netBalance: currentBalance },
      rows
    );
    if (ok) {
      setCopiedReportToast(true);
      setTimeout(() => setCopiedReportToast(false), 2500);
    }
  };

  const handleCopyId = () => {
    if (!selectedCustomer) return;
    const codeStr = selectedCustomer.code || selectedCustomer.id;
    navigator.clipboard.writeText(codeStr);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const getCategoryBadgeLabel = (cat?: ItemCategory, note?: string) => {
    if (note && (note.includes("برنج") || note.includes("شەکر") || note.includes("خواردن") || note.includes("مریشک"))) {
      return note;
    }
    if (cat === "chicken") return "مریشک";
    if (cat === "electrical") return "کارەبایی";
    if ((cat as string) === "rice") return "برنج";
    if ((cat as string) === "sugar") return "شەکر";
    return note || "خواردن";
  };

  const handleSaveModalTx = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCustId = modalCustId || selectedCustId || (customers[0] ? customers[0].id : "");
    if (!targetCustId) return;

    const numAmt = parseFloat(modalAmount);
    if (isNaN(numAmt) || numAmt <= 0) return;

    const targetCust = customers.find((c) => c.id === targetCustId);

    onAddTransaction({
      customerId: targetCustId,
      customerName: targetCust?.name || "کڕیار",
      customerCode: targetCust?.code,
      type: modalTxType,
      amount: numAmt,
      category: defaultTxType === "general_debt" ? "general_debt" : "daily_debt",
      note: modalNote.trim() || undefined,
      date: modalDate || todayISO(),
      time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      createdByUserId: activeUser.id,
      createdByName: activeUser.name,
    });

    setModalAmount("");
    setModalNote("");
    setShowAddModal(false);
  };

  return (
    <div dir="rtl" className="w-full space-y-5 animate-in fade-in duration-200">
      
      {/* ========================================================= */}
      {/* 1. TOP CYAN / PURPLE HEADER BAR (Matching Reference Image) */}
      {/* ========================================================= */}
      <div className={`${themeHeaderBg} text-white px-4 sm:px-6 py-3 rounded-2xl flex items-center justify-between shadow-sm no-print`}>
        <div className="flex items-center gap-3">
          <h2 className="text-base sm:text-lg font-black font-display text-white tracking-wide flex items-center gap-2">
            <span>مامەڵەکانی كڕیار ({sectionTitle})</span>
          </h2>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button className="p-1.5 hover:bg-white/10 rounded-xl transition text-white" title="گەڕان">
            <Search className="w-5 h-5" />
          </button>

          <div className="relative">
            <button className="p-1.5 hover:bg-white/10 rounded-xl transition text-white" title="ئاگادارییەکان">
              <Bell className="w-5 h-5" />
            </button>
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-teal-600">
              3
            </span>
          </div>

          {/* User Profile Chip */}
          <div className="flex items-center gap-2 pr-2 sm:pr-3 border-r border-white/20">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 border-2 border-white/60 overflow-hidden flex items-center justify-center font-bold text-white text-xs sm:text-sm">
              {activeUser.avatar ? (
                <img src={activeUser.avatar} alt="User" className="w-full h-full object-cover" />
              ) : (
                activeUser.name ? activeUser.name.slice(0, 1) : "م"
              )}
            </div>
            <div className="text-right text-xs hidden sm:block">
              <div className="font-extrabold text-white leading-tight">{activeUser.name || "مەریوان محمد"}</div>
              <div className="text-[10px] text-teal-100 font-medium">{activeUser.role === "admin" ? "بەڕێوەبەر" : "بەکارهێنەر"}</div>
            </div>
            <ChevronDown className="w-4 h-4 text-teal-100 hidden sm:block" />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. TOP CUSTOMER PROFILE CARD WITH 5 METRIC BLOCKS         */}
      {/* ========================================================= */}
      <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-xs p-4 sm:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          
          {/* BLOCK 1: CUSTOMER PROFILE DETAILS (Cols 4) */}
          <div className="lg:col-span-4 flex items-center gap-4 pl-4 lg:border-l border-slate-200/80">
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-200 border-2 border-slate-300 overflow-hidden flex items-center justify-center font-black text-slate-700 text-2xl shadow-inner">
                {selectedCustomer?.avatar ? (
                  <img src={selectedCustomer.avatar} alt={selectedCustomer.name} className="w-full h-full object-cover" />
                ) : (
                  selectedCustomer ? selectedCustomer.name.slice(0, 1) : "م"
                )}
              </div>
            </div>

            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Customer Select Dropdown */}
                <select
                  value={selectedCustId}
                  onChange={(e) => setSelectedCustId(e.target.value)}
                  className="text-base sm:text-lg font-black font-display text-slate-900 bg-transparent border-b border-slate-300 focus:outline-none cursor-pointer"
                >
                  {filteredCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span className={`${isPurple ? "bg-purple-600" : "bg-[#0096A6]"} text-white text-[10px] font-black px-2 py-0.5 rounded-md`}>
                  VIP
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                <span>ID: {selectedCustomer?.code || selectedCustomer?.id || "CUS-1001"}</span>
                <button onClick={handleCopyId} title="کۆپیکردن">
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />}
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-0.5 font-medium">
                <div className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono dir-ltr">{selectedCustomer?.phone || "0750 841 5775"}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedCustomer?.address || "سلێمانی - گەڕەکی سەروەشت"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* STAT CARDS (Cols 8) */}
          {isGeneral ? (
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: 🔴 کۆی قەرز */}
              <div className="flex items-center gap-3 p-3.5 bg-rose-50/80 rounded-2xl border border-rose-100 shadow-2xs">
                <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Wallet className="w-5.5 h-5.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-extrabold text-rose-800 truncate">🔴 کۆی قەرز</div>
                  <div className="text-base sm:text-lg font-black text-rose-600 font-mono leading-tight dir-ltr text-right">
                    {formatMoney(totalDebtsAdded)} <span className="text-[10px] font-bold text-slate-500">دینار</span>
                  </div>
                </div>
              </div>

              {/* Card 2: 🟢 کۆی پارەی واصل */}
              <div className="flex items-center gap-3 p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-100 shadow-2xs">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ArrowDownLeft className="w-5.5 h-5.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-extrabold text-emerald-800 truncate">🟢 کۆی پارەی واصل</div>
                  <div className="text-base sm:text-lg font-black text-emerald-600 font-mono leading-tight dir-ltr text-right">
                    {formatMoney(totalPaymentsMade)} <span className="text-[10px] font-bold text-slate-500">دینار</span>
                  </div>
                </div>
              </div>

              {/* Card 3: 🟠 قەرزی ماوە (کۆتایی) */}
              <div className="flex items-center gap-3 p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200/80 shadow-2xs">
                <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <PieChart className="w-5.5 h-5.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-extrabold text-amber-900 truncate">🟠 قەرزی ماوە (کۆتایی)</div>
                  <div className="text-base sm:text-lg font-black text-amber-600 font-mono leading-tight dir-ltr text-right">
                    {formatMoney(currentBalance)} <span className="text-[10px] font-bold text-slate-500">دینار</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              
              {/* 1. ژمارەی مامەڵەکان */}
              <div className="flex items-center gap-2.5 p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-slate-500 truncate">ژمارەی مامەڵەکان</div>
                  <div className="text-sm sm:text-base font-black text-slate-900 font-mono leading-tight">
                    {activeCustomerTx.length || 12}
                  </div>
                  <div className="text-[10px] text-slate-400">مامەڵە</div>
                </div>
              </div>

              {/* 2. دواین مامەڵە */}
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

              {/* 3. ماوەی قەرز */}
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

              {/* 4. پارەی واصل */}
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

              {/* 5. قەرزی گشتی / قەرزی ڕۆژانە */}
              <div className="flex items-center gap-2.5 p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                <div className={`w-10 h-10 rounded-xl ${themeIconBg} text-white flex items-center justify-center shrink-0 shadow-xs`}>
                  {isPurple ? <Wallet className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-slate-500 truncate">{sectionTitle}</div>
                  <div className={`text-sm sm:text-base font-black ${themeAccentText} font-mono leading-tight`}>
                    {formatMoney(totalDebtsAdded)}
                  </div>
                  <div className="text-[10px] text-slate-400">دینار</div>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. FILTER CONTROLS TOOLBAR (Exact layout from reference)  */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 no-print">
        
        {/* Table / Card View Mode Pill & Direct Export Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <button
            type="button"
            onClick={() => setViewTab("table")}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-2 ${
              viewTab === "table"
                ? `${isPurple ? "bg-purple-700" : "bg-[#0096A6]"} text-white shadow-xs`
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
                ? `${isPurple ? "bg-purple-700" : "bg-[#0096A6]"} text-white shadow-xs`
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
              placeholder="🔍 گەڕان بە ناوی قەرزدار، ژمارەی مۆبایل یان کۆدی کڕیار..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-3 pl-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 shadow-xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Add Button */}
          <button
            onClick={() => {
              setModalCustId(selectedCustId);
              setModalTxType(defaultTxType);
              setShowAddModal(true);
            }}
            className={`px-4 py-2 ${themeBtnBg} text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition active:scale-95 shrink-0`}
          >
            <span>زیاد کردن</span>
            <Plus className="w-4 h-4" />
          </button>

        </div>

      </div>

      {/* ========================================================= */}
      {/* 4. TABLE VIEW OR CARD VIEW CONTENT                         */}
      {/* ========================================================= */}
      {viewTab === "table" && (
        <div className="space-y-6">
          {/* SECTION 1: DEBT TABLE ("🔴 قەرزی گشتی / 🔴 قەرزی ڕۆژانە") */}
          <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-xs overflow-hidden">
            
            {/* Table Section Header */}
            <div className="px-5 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isPurple ? "bg-purple-600" : "bg-rose-600"}`} />
                <h3 className="text-sm font-black font-display text-slate-900">
                  {sectionTitle}
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
                    <th className="py-3 px-4 text-center font-extrabold text-slate-800">{isGeneral ? "کۆی قەرزی ماوە" : "قەرزی ماوە دوای مامەڵە"}</th>
                    <th className="py-3 px-4 text-center w-32 no-print">کردار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {paginatedDebtTx.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                        هیچ مامەڵەیەک لەم بەشەدا تۆمار نەکراوە.
                      </td>
                    </tr>
                  ) : (
                    paginatedDebtTx.map((tx, idx) => {
                      const realIndex = (debtPage - 1) * itemsPerPage + idx + 1;
                      const afterBalance = runningBalanceMap.get(tx.id) ?? 0;
                      const isPayment = tx.type === "payment";
                      const catLabel = isPayment ? "پارەی واصل" : getCategoryBadgeLabel(tx.category, tx.note);
                      const qty = isPayment ? 1 : (tx.quantity || 1);
                      const unitPrice = tx.unitPrice || (qty > 0 ? Math.round(tx.amount / qty) : tx.amount);
                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-center font-mono text-slate-400 font-bold">
                            {realIndex}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`inline-block ${isPayment ? "bg-emerald-100 text-emerald-800" : "bg-sky-100/80 text-sky-800"} text-[11px] font-extrabold px-3 py-1 rounded-full`}>
                              {catLabel}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-700 font-bold">
                            {qty}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-600 text-[11px]">
                            {formatMoney(unitPrice)}
                          </td>
                          <td className={`py-3 px-4 text-center font-mono font-black ${isPayment ? "text-emerald-600" : "text-red-600"} text-sm dir-ltr`}>
                            {isPayment ? `- ${formatMoney(tx.amount)}` : `+ ${formatMoney(tx.amount)}`}
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
                          <td className={`py-3 px-4 text-center font-mono font-black text-sm sm:text-base dir-ltr ${afterBalance <= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {formatMoney(afterBalance)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap no-print">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => selectedCustomer && onOpenReceipt(tx, selectedCustomer)}
                                className="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-400 flex items-center justify-center shadow-2xs transition"
                                title="بینین"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => selectedCustomer && onOpenReceipt(tx, selectedCustomer)}
                                className="w-7 h-7 rounded-full bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 flex items-center justify-center shadow-2xs transition"
                                title="چاپکردن"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
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
            <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium flex-wrap gap-2">
              <div>
                نیشان دانی {debtTxList.length > 0 ? (debtPage - 1) * itemsPerPage + 1 : 0} - {Math.min(debtPage * itemsPerPage, debtTxList.length)} له {debtTxList.length}
              </div>

              <div className="flex items-center gap-1 font-mono">
                <button onClick={() => setDebtPage(1)} disabled={debtPage === 1} className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-40">«</button>
                <button onClick={() => setDebtPage((p) => Math.max(1, p - 1))} disabled={debtPage === 1} className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-40">‹</button>
                <button className={`w-7 h-7 rounded-lg ${isPurple ? "bg-purple-700" : "bg-[#0096A6]"} text-white font-bold flex items-center justify-center`}>{debtPage}</button>
                {Math.ceil(debtTxList.length / itemsPerPage) >= 2 && (
                  <button onClick={() => setDebtPage(2)} className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center">2</button>
                )}
                {Math.ceil(debtTxList.length / itemsPerPage) >= 3 && (
                  <button onClick={() => setDebtPage(3)} className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center">3</button>
                )}
                {Math.ceil(debtTxList.length / itemsPerPage) > 3 && <span className="px-1 text-slate-400">...</span>}
                {Math.ceil(debtTxList.length / itemsPerPage) >= 10 && (
                  <button onClick={() => setDebtPage(10)} className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center">10</button>
                )}
                <button onClick={() => setDebtPage((p) => Math.min(Math.ceil(debtTxList.length / itemsPerPage) || 1, p + 1))} disabled={debtPage >= Math.ceil(debtTxList.length / itemsPerPage)} className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-40">›</button>
                <button onClick={() => setDebtPage(Math.ceil(debtTxList.length / itemsPerPage) || 1)} disabled={debtPage >= Math.ceil(debtTxList.length / itemsPerPage)} className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-40">»</button>
              </div>

              <div className="flex items-center gap-1">
                <span>تۆمار هەر پەڕە</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>

          </div>

          {/* SECTION 2: RECEIVED PAYMENTS TABLE ("🟢 پارەی واسڵ") - ONLY IN DAILY DEBT MODE */}
          {!isGeneral && (
            <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-xs overflow-hidden">
              
              {/* Table Section Header */}
              <div className="px-5 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-sm font-black font-display text-slate-900">
                    پارەی واسڵ
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
                    {paginatedPaymentTx.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                          هیچ پارەیەکی واسڵ نەکراوە.
                        </td>
                      </tr>
                    ) : (
                      paginatedPaymentTx.map((tx, idx) => {
                        const realIndex = (paymentPage - 1) * itemsPerPage + idx + 1;
                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 text-center font-mono text-slate-400 font-bold">
                              {realIndex}
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
                                <button
                                  onClick={() => selectedCustomer && onOpenReceipt(tx, selectedCustomer)}
                                  className="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-400 flex items-center justify-center shadow-2xs transition"
                                  title="بینین"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => selectedCustomer && onOpenReceipt(tx, selectedCustomer)}
                                  className="w-7 h-7 rounded-full bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 flex items-center justify-center shadow-2xs transition"
                                  title="چاپکردن"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
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
              <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium flex-wrap gap-2">
                <div>
                  نیشان دانی {paymentTxList.length > 0 ? (paymentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(paymentPage * itemsPerPage, paymentTxList.length)} له {paymentTxList.length}
                </div>

                <div className="flex items-center gap-1 font-mono">
                  <button onClick={() => setPaymentPage(1)} disabled={paymentPage === 1} className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-40">«</button>
                  <button onClick={() => setPaymentPage((p) => Math.max(1, p - 1))} disabled={paymentPage === 1} className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-40">‹</button>
                  <button className={`w-7 h-7 rounded-lg ${isPurple ? "bg-purple-700" : "bg-[#0096A6]"} text-white font-bold flex items-center justify-center`}>{paymentPage}</button>
                  {Math.ceil(paymentTxList.length / itemsPerPage) >= 3 && (
                    <button onClick={() => setPaymentPage(3)} className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center">2</button>
                  )}
                  {Math.ceil(paymentTxList.length / itemsPerPage) >= 10 && (
                    <button onClick={() => setPaymentPage(10)} className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center">10</button>
                  )}
                  <button onClick={() => setPaymentPage((p) => Math.min(Math.ceil(paymentTxList.length / itemsPerPage) || 1, p + 1))} disabled={paymentPage >= Math.ceil(paymentTxList.length / itemsPerPage)} className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-40">›</button>
                  <button onClick={() => setPaymentPage(Math.ceil(paymentTxList.length / itemsPerPage) || 1)} disabled={paymentPage >= Math.ceil(paymentTxList.length / itemsPerPage)} className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-40">»</button>
                </div>

                <div className="flex items-center gap-1">
                  <span>تۆمار هەر پەڕە</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* CARD VIEW MODE                                             */}
      {/* ========================================================= */}
      {viewTab === "card" && (
        <div className="space-y-4">
          {paginatedCardTx.length === 0 ? (
            <div className="bg-white rounded-[20px] border border-slate-200/80 p-10 text-center text-slate-400 text-xs">
              هیچ مامەڵەیەک نەدۆزرایەوە.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedCardTx.map((tx) => {
                const afterBalance = runningBalanceMap.get(tx.id) ?? 0;
                const isPayment = tx.type === "payment";
                const catLabel = isPayment ? "پارەی واصل" : getCategoryBadgeLabel(tx.category, tx.note);
                const qty = isPayment ? 1 : (tx.quantity || 1);
                const unitPrice = tx.unitPrice || (qty > 0 ? Math.round(tx.amount / qty) : tx.amount);

                return (
                  <div
                    key={tx.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-4.5 flex flex-col justify-between space-y-3.5"
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
                          {formatDate(tx.date)} | {tx.time || "18:04"}
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
                        onClick={() => selectedCustomer && onOpenReceipt(tx, selectedCustomer)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-xs flex items-center gap-1 shadow-2xs transition"
                        title="بینین"
                      >
                        <Eye className="w-3.5 h-3.5 text-teal-600" />
                        <span>بینین</span>
                      </button>
                      <button
                        onClick={() => selectedCustomer && onOpenReceipt(tx, selectedCustomer)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-xs flex items-center gap-1 shadow-2xs transition"
                        title="دەستکاری"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>دەستکاری</span>
                      </button>
                      <button
                        onClick={() => selectedCustomer && onOpenReceipt(tx, selectedCustomer)}
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
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>سڕینەوە</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Footer for Card View */}
          <div className="px-5 py-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between text-xs text-slate-500 font-medium flex-wrap gap-2">
            <div>
              نیشان دانی {allCardTxList.length > 0 ? (cardPage - 1) * itemsPerPage + 1 : 0} - {Math.min(cardPage * itemsPerPage, allCardTxList.length)} له {allCardTxList.length}
            </div>

            <div className="flex items-center gap-1 font-mono">
              <button onClick={() => setCardPage(1)} disabled={cardPage === 1} className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-40">«</button>
              <button onClick={() => setCardPage((p) => Math.max(1, p - 1))} disabled={cardPage === 1} className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-40">‹</button>
              <button className={`w-7 h-7 rounded-lg ${isPurple ? "bg-purple-700" : "bg-[#0096A6]"} text-white font-bold flex items-center justify-center`}>{cardPage}</button>
              {Math.ceil(allCardTxList.length / itemsPerPage) >= 2 && (
                <button onClick={() => setCardPage(2)} className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center">2</button>
              )}
              {Math.ceil(allCardTxList.length / itemsPerPage) >= 3 && (
                <button onClick={() => setCardPage(3)} className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center">3</button>
              )}
              <button onClick={() => setCardPage((p) => Math.min(Math.ceil(allCardTxList.length / itemsPerPage) || 1, p + 1))} disabled={cardPage >= Math.ceil(allCardTxList.length / itemsPerPage)} className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-40">›</button>
              <button onClick={() => setCardPage(Math.ceil(allCardTxList.length / itemsPerPage) || 1)} disabled={cardPage >= Math.ceil(allCardTxList.length / itemsPerPage)} className="px-2 py-1 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-40">»</button>
            </div>

            <div className="flex items-center gap-1">
              <span>تۆمار هەر پەڕە</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. BOTTOM SUMMARY CARDS ROW (3 Cards matching reference)  */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: کۆی قەرز (Total Debt) */}
        <div className="bg-[#FFF5F5] border border-red-200/60 rounded-[20px] p-5 flex items-center gap-4 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            {isPurple ? <Wallet className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-600">کۆی قەرز ({sectionTitle})</div>
            <div className="text-xl font-black text-red-600 font-mono">
              {formatMoney(totalDebtsAdded)} <span className="text-xs font-bold text-slate-500">دینار</span>
            </div>
          </div>
        </div>

        {/* Card 2: کۆی پارەی واسڵ (Total Payments) */}
        <div className="bg-[#F0FDF4] border border-emerald-200/60 rounded-[20px] p-5 flex items-center gap-4 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Banknote className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-600">کۆی پارەی واسڵ</div>
            <div className="text-xl font-black text-emerald-600 font-mono">
              {formatMoney(totalPaymentsMade)} <span className="text-xs font-bold text-slate-500">دینار</span>
            </div>
          </div>
        </div>

        {/* Card 3: باڵانسی ئێستا (Current Balance) / قەرزی ماوە */}
        <div className="bg-[#FFF7ED] border border-amber-200/60 rounded-[20px] p-5 flex items-center gap-4 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <PieChart className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-600">
              {isGeneral ? "🟠 قەرزی ماوە (کۆتایی)" : "باڵانسی ئێستا"}
            </div>
            <div className="text-xl font-black text-amber-600 font-mono">
              {formatMoney(currentBalance)} <span className="text-xs font-bold text-slate-500">دینار</span>
            </div>
          </div>
        </div>

      </div>

      {/* QUICK ADD TRANSACTION MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Plus className={`w-5 h-5 ${isPurple ? "text-purple-600" : "text-teal-600"}`} />
                <span>تۆمارکردنی مامەڵەی نوێ ({sectionTitle})</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModalTx} className="space-y-3.5">
              {/* Type selector */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setModalTxType(defaultTxType)}
                  className={`py-2 rounded-xl transition ${
                    modalTxType !== "payment"
                      ? `${themeHeaderBg} text-white shadow-xs`
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {isGeneral ? "قەرزپێدان (Debt Given)" : sectionTitle}
                </button>
                <button
                  type="button"
                  onClick={() => setModalTxType("payment")}
                  className={`py-2 rounded-xl transition ${
                    modalTxType === "payment"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {isGeneral ? "قەرزوەرگرتن (Debt Received)" : "پارەی واسڵکراو"}
                </button>
              </div>

              {/* Customer Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">کڕیار <span className="text-red-500">*</span></label>
                <select
                  required
                  value={modalCustId}
                  onChange={(e) => setModalCustId(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `[ژمارە: #${c.code}]` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">بڕی پارە (دیناری عێراقی IQD) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={modalAmount}
                  onChange={(e) => setModalAmount(e.target.value)}
                  placeholder="0"
                  required
                  min="250"
                  step="250"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-base font-black font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 dir-ltr text-left"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تێبینی</label>
                <input
                  type="text"
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  placeholder="تێبینی بنووسە..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">بەرواری مامەڵە</label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3 ${themeHeaderBg} text-white rounded-2xl text-xs font-bold shadow-md hover:opacity-95`}
                >
                  تۆمارکردن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

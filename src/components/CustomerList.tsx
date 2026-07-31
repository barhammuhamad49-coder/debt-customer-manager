import React, { useState, useMemo } from "react";
import {
  Search,
  Phone,
  Calendar,
  SlidersHorizontal,
  Bell,
  FileSpreadsheet,
  Mic,
  MoreVertical,
  Plus,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  UserCheck,
  Send,
  Eye,
} from "lucide-react";
import { Customer, Transaction, TransactionType } from "../types";
import {
  calculateCustomerBalance,
  formatMoney,
  getLastActivityDate,
  todayISO,
  getOverdueInfo,
} from "../utils/storage";
import { CreditRatingBadge } from "./CreditRatingBadge";
import { calculateCustomerCreditRating } from "../utils/creditRating";
import { OverdueNotificationBanner } from "./OverdueNotificationBanner";
import { VoiceModeModal } from "./VoiceModeModal";
import { GeneralDebtHeaderCard } from "./GeneralDebtHeaderCard";

interface CustomerListProps {
  customers: Customer[];
  transactions: Transaction[];
  searchQueryState?: string;
  overdueThresholdDays?: number;
  onSelectCustomer: (customer: Customer) => void;
  onOpenAddCustomer: () => void;
  onQuickAddDebt: (customer: Customer) => void;
  onQuickAddPayment: (customer: Customer) => void;
  onOpenSendReminder?: (customer: Customer, balance: number, overdueDays: number) => void;
  onOpenExportReport?: (customerId?: string) => void;
  filterDebtorsOnlyState?: boolean;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  transactions,
  searchQueryState = "",
  overdueThresholdDays = 30,
  onSelectCustomer,
  onOpenAddCustomer,
  onQuickAddDebt,
  onQuickAddPayment,
  onOpenSendReminder,
  onOpenExportReport,
  filterDebtorsOnlyState,
}) => {
  const [searchQuery, setSearchQuery] = useState(searchQueryState);
  const [filterType, setFilterType] = useState<"all" | "debtors" | "settled">(
    filterDebtorsOnlyState ? "debtors" : "all"
  );
  const [sortBy, setSortBy] = useState<"balance_desc" | "balance_asc" | "name_asc" | "date_desc">("balance_desc");
  const [txTypeFilter, setTxTypeFilter] = useState<"all" | TransactionType>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Sync prop searchQueryState if changed from top header bar
  React.useEffect(() => {
    if (searchQueryState !== undefined) {
      setSearchQuery(searchQueryState);
    }
  }, [searchQueryState]);

  // Close actions menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Filter & Sort customers
  const filteredCustomers = useMemo(() => {
    const list = customers
      .map((c, index) => {
        const custTx = transactions.filter((t) => {
          if (t.customerId !== c.id) return false;
          if (txTypeFilter !== "all" && t.type !== txTypeFilter) return false;
          if (startDate && t.date < startDate) return false;
          if (endDate && t.date > endDate) return false;
          return true;
        });

        const balance = calculateCustomerBalance(c.id, transactions);
        const lastDate = getLastActivityDate(c.id, transactions);
        const createdDate = c.createdAt ? c.createdAt.slice(0, 10) : "";

        return { ...c, balance, lastDate, createdDate, custTxCount: custTx.length, originalIndex: index + 1 };
      })
      .filter((c) => {
        // Search filter (Customer Name, Phone Number, Customer ID/Code)
        const rawQuery = searchQuery.trim().toLowerCase();
        if (!rawQuery) return true;

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

        const queryNorm = normalizeDigits(rawQuery);

        const matchesName = c.name ? c.name.toLowerCase().includes(rawQuery) : false;
        const matchesPhone = c.phone ? normalizeDigits(c.phone.toLowerCase()).includes(queryNorm) : false;
        const matchesCode = c.code ? normalizeDigits(c.code.toLowerCase()).includes(queryNorm) : false;

        const matchesSearch = matchesName || matchesPhone || matchesCode;

        if (!matchesSearch) return false;

        // Status filter
        if (filterType === "debtors") return c.balance > 0;
        if (filterType === "settled") return c.balance <= 0;

        return true;
      });

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === "balance_desc") return b.balance - a.balance;
      if (sortBy === "balance_asc") return a.balance - b.balance;
      if (sortBy === "name_asc") return a.name.localeCompare(b.name, "ckb");
      if (sortBy === "date_desc") {
        const dateA = a.lastDate || a.createdDate || "";
        const dateB = b.lastDate || b.createdDate || "";
        return dateB.localeCompare(dateA);
      }
      return 0;
    });
  }, [customers, transactions, searchQuery, filterType, sortBy, txTypeFilter, startDate, endDate]);

  // Calculate Header Quick Stats
  const totalDebtorsCount = useMemo(() => {
    return customers.filter((c) => calculateCustomerBalance(c.id, transactions) > 0).length;
  }, [customers, transactions]);

  const totalRemainingDebt = useMemo(() => {
    return customers.reduce((sum, c) => sum + Math.max(0, calculateCustomerBalance(c.id, transactions)), 0);
  }, [customers, transactions]);

  return (
    <div className="space-y-3 mb-10 no-print font-sans text-stone-900">
      
      {/* 1. Overall Debt Summary Header Card (پوختەی قەرزی گشتی) */}
      <GeneralDebtHeaderCard
        customers={customers}
        transactions={transactions}
        overdueThresholdDays={overdueThresholdDays}
        onFilterDebtorsOnly={() => setFilterType("debtors")}
      />

      {/* 2. Main Search & Filter / Sort Toolbar */}
      <div className="bg-white rounded-2xl p-2.5 px-3.5 border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        
        {/* Search Input */}
        <div className="flex-1 flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200/80">
          <Search className="w-4 h-4 text-stone-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 گەڕان بە ناوی قەرزدار، ژمارەی مۆبایل یان کۆدی کڕیار..."
            className="w-full bg-transparent text-right text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none"
          />
        </div>

        {/* Action Controls: Filter, Sort & Voice */}
        <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 text-xs">
          
          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl border border-stone-200 focus:outline-none text-xs cursor-pointer"
            title="ڕێکخستن / Sort"
          >
            <option value="balance_desc">پێوانە: بەرزترین قەرز ⬇️</option>
            <option value="balance_asc">پێوانە: نزمترین قەرز ⬆️</option>
            <option value="name_asc">پێوانە: ناوی کڕیار (ئەلفوبێ)</option>
            <option value="date_desc">پێوانە: دوا چالاکی</option>
          </select>

          {/* Toggle Filter Panel */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition text-xs ${
              showAdvancedFilters || filterType !== "all"
                ? "bg-[#008767] text-white shadow-2xs"
                : "bg-stone-100 hover:bg-stone-200 text-stone-700"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>⚙️ فلتەر</span>
          </button>

          {/* Voice Mode */}
          <button
            type="button"
            onClick={() => setIsVoiceOpen(true)}
            className="px-2.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl font-bold flex items-center gap-1 shrink-0"
            title="گەڕان یان تۆمارکردنی دەنگی 🎤"
          >
            <Mic className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
            <span>دەنگ</span>
          </button>

          {/* Export Report */}
          {onOpenExportReport && (
            <button
              type="button"
              onClick={() => onOpenExportReport()}
              className="px-2.5 py-1.5 bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100 rounded-xl font-bold flex items-center gap-1 shrink-0"
              title="ڕاپۆرتی گشتی"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
              <span>ڕاپۆرت</span>
            </button>
          )}
        </div>

      </div>

      {/* Advanced Filter Panel Toggle (if clicked) */}
      {showAdvancedFilters && (
        <div className="bg-white rounded-2xl p-3 border border-stone-200/90 shadow-2xs space-y-3 animate-in fade-in duration-150 text-xs">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                filterType === "all"
                  ? "bg-[#008767] text-white shadow-2xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              هەموو ({customers.length})
            </button>
            <button
              onClick={() => setFilterType("debtors")}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                filterType === "debtors"
                  ? "bg-red-600 text-white shadow-2xs"
                  : "bg-red-50 text-red-700 hover:bg-red-100"
              }`}
            >
              قەرزاران ({totalDebtorsCount})
            </button>
            <button
              onClick={() => setFilterType("settled")}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                filterType === "settled"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              پاکتاوکراو
            </button>
          </div>

          {/* Date Range Filter */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-100">
            <div>
              <label className="block font-bold text-stone-600 mb-0.5 text-[10px]">لە بەرواری:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg font-mono text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-600 mb-0.5 text-[10px]">بۆ بەرواری:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg font-mono text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Overdue Notification Banner */}
      <OverdueNotificationBanner
        customers={customers}
        transactions={transactions}
        overdueThresholdDays={overdueThresholdDays}
        onOpenSendReminder={(cust, bal, days) => {
          if (onOpenSendReminder) {
            onOpenSendReminder(cust, bal, days);
          }
        }}
        onSelectCustomer={onSelectCustomer}
      />

      {/* 4. Professional Accounting Ledger Table View (دەفتەری محاسەبە) */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden font-sans">
        
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-700">هیچ کڕیارێک نەدۆزرایەوە</h3>
            <p className="text-xs text-stone-400 max-w-sm mx-auto mt-1">
              دڵنیابەوە لە گەڕان یان فلتەرەکانی سەرەوە.
            </p>
            <button
              onClick={onOpenAddCustomer}
              className="mt-3 px-4 py-2 bg-[#008767] text-white text-xs font-bold rounded-xl hover:bg-[#007256] transition"
            >
              زیادکردنی کڕیاری نوێ
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200/80 text-stone-600 font-extrabold text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 text-center w-8">#</th>
                  <th className="py-2.5 px-3 text-center w-20">Customer ID</th>
                  <th className="py-2.5 px-3">ناو</th>
                  <th className="py-2.5 px-3">ژمارەی مۆبایل</th>
                  <th className="py-2.5 px-3 text-left dir-ltr">باڵانس</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-left dir-ltr">دوا مامەڵە</th>
                  <th className="py-2.5 px-3 text-center w-12">⋮</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredCustomers.map((customer, idx) => {
                  const hasDebt = customer.balance > 0;
                  const isSettled = customer.balance <= 0;
                  const todayStr = todayISO();
                  const hasTodayTx = transactions.some(
                    (t) => t.customerId === customer.id && t.date && t.date.slice(0, 10) === todayStr
                  );
                  const overdueInfo = getOverdueInfo(customer.id, transactions, overdueThresholdDays);
                  const displayDate = customer.lastDate || customer.createdDate || todayISO();
                  const isNearDue = overdueInfo.isOverdue && overdueInfo.overdueDays >= Math.floor(overdueThresholdDays * 0.7);

                  return (
                    <tr
                      key={customer.id}
                      onClick={() => onSelectCustomer(customer)}
                      className="group hover:bg-emerald-50/40 active:bg-emerald-100/50 transition-all duration-150 cursor-pointer select-none"
                    >
                      {/* 1. # */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-stone-400 text-[11px] group-hover:text-emerald-700">
                        {idx + 1}
                      </td>

                      {/* 2. Customer ID */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="font-mono font-extrabold text-[11px] text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md dir-ltr inline-block">
                          #{customer.code || customer.id.slice(0, 5)}
                        </span>
                      </td>

                      {/* 3. ناو */}
                      <td className="py-3 px-3 font-bold text-stone-900 group-hover:text-[#008767] text-xs sm:text-sm whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-[#008767] flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
                            {customer.name.charAt(0)}
                          </div>
                          <span>{customer.name}</span>
                          <CreditRatingBadge
                            rating={calculateCustomerCreditRating(customer.id, transactions, overdueThresholdDays)}
                            size="sm"
                          />
                        </div>
                      </td>

                      {/* 4. ژمارەی مۆبایل */}
                      <td className="py-3 px-3 font-mono text-[11px] text-stone-600 whitespace-nowrap dir-ltr text-right">
                        {customer.phone ? (
                          <span className="flex items-center gap-1 justify-end text-stone-700">
                            <Phone className="w-3 h-3 text-stone-400" />
                            {customer.phone}
                          </span>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>

                      {/* 5. باڵانس */}
                      <td className="py-3 px-3 text-left dir-ltr whitespace-nowrap">
                        <span
                          className={`font-black font-mono text-xs sm:text-sm ${
                            hasDebt ? "text-emerald-700" : "text-stone-700"
                          }`}
                        >
                          {formatMoney(customer.balance)}
                        </span>
                      </td>

                      {/* 6. Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {overdueInfo.isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                            🔴 دواکاری تێپەڕیو ({overdueInfo.overdueDays} ڕۆژ)
                          </span>
                        ) : isNearDue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            🟡 دواکاری نزیک
                          </span>
                        ) : hasTodayTx ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            🟢 مامەڵەی ئەمڕۆ
                          </span>
                        ) : isSettled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ✅ تەواوبوو
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                            ⚪ ئاسایی
                          </span>
                        )}
                      </td>

                      {/* 7. دوا مامەڵە */}
                      <td className="py-3 px-3 text-left dir-ltr font-mono text-[11px] text-stone-500 whitespace-nowrap">
                        {displayDate}
                      </td>

                      {/* 8. Action Menu (⋮) */}
                      <td className="py-3 px-3 text-center relative whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === customer.id ? null : customer.id);
                          }}
                          className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition"
                          title="کردارەکان"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu (⋮) */}
                        {activeMenuId === customer.id && (
                          <div className="absolute left-3 top-10 z-30 bg-white rounded-xl shadow-lg border border-stone-200 py-1.5 w-44 text-right animate-in fade-in zoom-in-95 duration-100">
                            {/* بینینی وردەکاری */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                onSelectCustomer(customer);
                              }}
                              className="w-full px-3 py-1.5 text-stone-700 hover:bg-stone-50 font-bold flex items-center gap-2 text-xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-stone-500" />
                              <span>بینینی وردەکاری</span>
                            </button>

                            {/* دەستکاری */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                onSelectCustomer(customer);
                              }}
                              className="w-full px-3 py-1.5 text-stone-700 hover:bg-stone-50 font-bold flex items-center gap-2 text-xs"
                            >
                              <span>✏️</span>
                              <span>دەستکاری</span>
                            </button>

                            {/* قەرزی نوێ */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                onQuickAddDebt(customer);
                              }}
                              className="w-full px-3 py-1.5 text-emerald-800 hover:bg-emerald-50 font-bold flex items-center gap-2 text-xs border-t border-stone-100 mt-1 pt-1.5"
                            >
                              <Plus className="w-3.5 h-3.5 text-emerald-600" />
                              <span>قەرزی نوێ (➕)</span>
                            </button>

                            {/* پارەدانەوە */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                onQuickAddPayment(customer);
                              }}
                              className="w-full px-3 py-1.5 text-rose-800 hover:bg-rose-50 font-bold flex items-center gap-2 text-xs"
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5 text-rose-600" />
                              <span>پارەدانەوە (💵)</span>
                            </button>

                            {/* PDF / ڕاپۆرت */}
                            {onOpenExportReport && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  onOpenExportReport(customer.id);
                                }}
                                className="w-full px-3 py-1.5 text-indigo-900 hover:bg-indigo-50 font-bold flex items-center gap-2 text-xs border-t border-stone-100 mt-1 pt-1.5"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                                <span>PDF / ڕاپۆرت</span>
                              </button>
                            )}

                            {/* Share / بیرخستنەوە */}
                            {hasDebt && onOpenSendReminder && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  onOpenSendReminder(customer, customer.balance, overdueInfo.overdueDays);
                                }}
                                className="w-full px-3 py-1.5 text-amber-900 hover:bg-amber-50 font-bold flex items-center gap-2 text-xs"
                              >
                                <Send className="w-3.5 h-3.5 text-amber-600" />
                                <span>Share / بیرخستنەوە</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Voice Mode Modal */}
      <VoiceModeModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        sectionTitle="ماڵەکان"
        customers={customers}
        onApplyVoiceInput={({ transcript, matchedCustomer, customerNotFound, spokenCustomerQuery }) => {
          if (matchedCustomer) {
            onSelectCustomer(matchedCustomer);
          } else if (customerNotFound) {
            alert(`⚠️ کڕیارێک بە ناوی (${spokenCustomerQuery || "دەنگەکە"}) لە داتابەیسدا نەدۆزرایەوە!\nهیچ داتایەک ساڤ نەکرا.`);
            setSearchQuery(spokenCustomerQuery || transcript);
          } else if (transcript) {
            setSearchQuery(transcript);
          }
        }}
        initialPrompt="ناوی کڕیار، کۆد یان بڕی قەرز بە دەنگ بڵێ..."
      />

    </div>
  );
};




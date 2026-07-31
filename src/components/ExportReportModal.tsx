import React, { useState, useMemo } from "react";
import { X, FileSpreadsheet, Printer, Share2, Calendar, FileText, Check, Filter, User, AlertCircle, Download, Send, Copy } from "lucide-react";
import { Customer, Transaction } from "../types";
import { formatMoney, todayISO } from "../utils/storage";
import {
  DateFilterType,
  ExportFilterOptions,
  filterTransactionsForExport,
  prepareExportRows,
  exportToExcel,
  printOrPdfReport,
  printMultiCustomerPdfReport,
  buildShareSummaryText,
  copyReportToClipboard,
} from "../utils/exportUtils";

interface ExportReportModalProps {
  isOpen: boolean;
  customers: Customer[];
  transactions: Transaction[];
  initialCustomerId?: string | "all";
  initialSectionType?: "all" | "general_debt" | "daily_debt" | "daily_request";
  onClose: () => void;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  customers,
  transactions,
  initialCustomerId = "all",
  initialSectionType = "all",
  onClose,
}) => {
  if (!isOpen) return null;

  const [dateFilter, setDateFilter] = useState<DateFilterType>("all");
  const [startDate, setStartDate] = useState<string>(todayISO());
  const [endDate, setEndDate] = useState<string>(todayISO());
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | "all">(initialCustomerId);
  const [sectionType, setSectionType] = useState<"all" | "general_debt" | "daily_debt" | "daily_request">(initialSectionType);
  const [userFilter, setUserFilter] = useState<string | "all">("all");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string | "all">("all");
  const [copiedShareText, setCopiedShareText] = useState(false);
  const [splitPagesPerCustomer, setSplitPagesPerCustomer] = useState(true);

  // Extract unique users list for filter
  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.createdByName) set.add(t.createdByName);
    });
    return Array.from(set);
  }, [transactions]);

  // Compute filtered data
  const filterOptions: ExportFilterOptions = {
    dateFilter,
    startDate,
    endDate,
    customerId: selectedCustomerId,
    sectionType,
    userFilter,
    transactionType: transactionTypeFilter,
  };

  const { filteredTxs, targetCustomer } = filterTransactionsForExport(transactions, customers, filterOptions);
  const exportRows = prepareExportRows(filteredTxs, customers);

  // Compute summary stats
  const totalDebt = filteredTxs
    .filter((t) => t.type !== "payment")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPayments = filteredTxs
    .filter((t) => t.type === "payment")
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalDebt - totalPayments;

  const titleText = targetCustomer
    ? `ڕاپۆرتی قەرزی (${targetCustomer.name})`
    : sectionType === "general_debt"
    ? "ڕاپۆرتی قەرزی گشتی"
    : sectionType === "daily_debt"
    ? "ڕاپۆرتی قەرزی کاتی"
    : "ڕاپۆرتی گشتی قەرزەکان";

  const subtitleText =
    dateFilter === "today"
      ? "مامەڵەکانی ئەمڕۆ"
      : dateFilter === "this_week"
      ? "مامەڵەکانی ئەم هەفتەیە"
      : dateFilter === "this_month"
      ? "مامەڵەکانی ئەم مانگە"
      : dateFilter === "custom"
      ? `لە ${startDate} تا ${endDate}`
      : "سەرجەم بەروارەکان";

  const filename = targetCustomer
    ? `${targetCustomer.name.replace(/\s+/g, "_")}_${todayISO()}`
    : `Raporta_Qerzakan_${todayISO()}`;

  const handleExportExcel = () => {
    exportToExcel(titleText, exportRows, filename, {
      totalDebt,
      totalPayments,
      netBalance,
    });
  };

  const handlePrintPdf = () => {
    if (selectedCustomerId === "all" && splitPagesPerCustomer) {
      printMultiCustomerPdfReport(
        titleText,
        subtitleText,
        customers,
        transactions,
        filterOptions,
        "دەفتەری دیجیتالی دووکان"
      );
    } else {
      printOrPdfReport(
        titleText,
        subtitleText,
        exportRows,
        { totalDebt, totalPayments, netBalance },
        "دەفتەری دیجیتالی دووکان"
      );
    }
  };

  const handlePrintFlatPdf = () => {
    printOrPdfReport(
      titleText,
      subtitleText,
      exportRows,
      { totalDebt, totalPayments, netBalance },
      "دەفتەری دیجیتالی دووکان"
    );
  };

  const handleCopyReportText = async () => {
    const success = await copyReportToClipboard(
      titleText,
      targetCustomer ? targetCustomer.name : null,
      { totalDebt, totalPayments, netBalance },
      exportRows
    );
    if (success) {
      setCopiedShareText(true);
      setTimeout(() => setCopiedShareText(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 no-print animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-indigo-950 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base font-display text-white">
                دەرهێنانی ڕاپۆرت و چاپکردن (Export & Print)
              </h3>
              <p className="text-xs text-stone-300 mt-0.5">
                دروستکردنی ڕاپۆرتی PDF، Excel یان چاپی ڕاستەوخۆ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-stone-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-right">
          
          {/* Target Customer / Section Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-stone-500" />
                دیاریکردنی کڕیار:
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">👥 هەموو کڕیاران</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    👤 {c.name} ({c.phone || "بێ ژمارە"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-stone-500" />
                بەکارهێنەر:
              </label>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">👥 هەموو بەکارهێنەران</option>
                {uniqueUsers.map((u) => (
                  <option key={u} value={u}>
                    👤 {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-stone-500" />
                جۆری مامەڵە:
              </label>
              <select
                value={transactionTypeFilter}
                onChange={(e) => setTransactionTypeFilter(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">⚡ هەموو جۆرەکان</option>
                <option value="general_debt">🔴 قەرزی گشتی</option>
                <option value="daily_debt">🟡 قەرزی کاتی</option>
                <option value="payment">🟢 پارەی واصل (وەسڵ)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-stone-500" />
                بەشی قەرز:
              </label>
              <select
                value={sectionType}
                onChange={(e) => setSectionType(e.target.value as any)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">📦 سەرجەم مامەڵەکان</option>
                <option value="daily_debt">🟢 تەنها قەرزی کاتی</option>
              </select>
            </div>
          </div>

          {/* Date Filter Selection */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-3">
            <label className="block text-xs font-extrabold text-stone-800 flex items-center gap-1">
              <Calendar className="w-4 h-4 text-indigo-600" />
              ماوەی بەروار:
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { key: "all", label: "هەمووی" },
                { key: "today", label: "ئەمڕۆ" },
                { key: "this_week", label: "ئەم هەفتەیە" },
                { key: "this_month", label: "ئەم مانگە" },
                { key: "custom", label: "ماوەی تایبەت" },
              ].map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => setDateFilter(btn.key as DateFilterType)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                    dateFilter === btn.key
                      ? "bg-indigo-600 text-white shadow-xs font-black"
                      : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs if 'custom' selected */}
            {dateFilter === "custom" && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-200">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">
                    لە بەرواری:
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">
                    تا بەرواری:
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-stone-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Report Summary Preview */}
          <div className="bg-indigo-50/60 rounded-2xl p-4 border border-indigo-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs font-extrabold text-indigo-950">
              <span>پوختەی ڕاپۆرتی هەڵبژێردراو:</span>
              <span className="font-mono bg-indigo-100 px-2.5 py-0.5 rounded-full text-indigo-900">
                {exportRows.length} مامەڵە
              </span>
            </div>

            {/* Split Page Option for PDF when ALL customers selected */}
            {selectedCustomerId === "all" && (
              <label className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-indigo-200 cursor-pointer text-xs font-bold text-stone-800 hover:bg-indigo-50/50 transition">
                <input
                  type="checkbox"
                  checked={splitPagesPerCustomer}
                  onChange={(e) => setSplitPagesPerCustomer(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                />
                <span className="flex-1">
                  📑 دروستکردنی پەڕەی جیاواز (مستەقل) بۆ هەر قەرزدارێک لە فایلێکی PDF
                </span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                  تایبەتمەندی نوێ ✨
                </span>
              </label>
            )}

            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-500 font-bold block">کۆی قەرز</span>
                <span className="text-xs font-black font-mono text-red-600 block mt-0.5">
                  {formatMoney(totalDebt)}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-500 font-bold block">کۆی وەرگیراو</span>
                <span className="text-xs font-black font-mono text-emerald-600 block mt-0.5">
                  {formatMoney(totalPayments)}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-500 font-bold block">پاشماوە</span>
                <span className="text-xs font-black font-mono text-stone-900 block mt-0.5">
                  {formatMoney(netBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            
            {/* PDF & Print Button */}
            <button
              onClick={handlePrintPdf}
              className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
            >
              <FileText className="w-5 h-5" />
              <span>Export to PDF</span>
            </button>

            {/* Excel Download Button */}
            <button
              onClick={handleExportExcel}
              className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>Export to Excel (.xlsx)</span>
            </button>

            {/* Direct Print Button */}
            <button
              onClick={handlePrintFlatPdf}
              className="p-3 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
            >
              <Printer className="w-5 h-5" />
              <span>Print Report</span>
            </button>

            {/* Copy Report Button */}
            <button
              onClick={handleCopyReportText}
              className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-xs transition active:scale-95"
            >
              <Copy className="w-5 h-5" />
              <span>{copiedShareText ? "کۆپی کرا! ✅" : "Copy Report"}</span>
            </button>

          </div>

        </div>

        {/* Footer */}
        <div className="bg-stone-100 p-4 border-t border-stone-200 text-left flex items-center justify-between shrink-0">
          <span className="text-[11px] text-stone-500 font-bold">
            پشتیوانی تەواوی فۆنتی کوردی و RTL دەکات
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold transition"
          >
            داخستن
          </button>
        </div>

      </div>
    </div>
  );
};

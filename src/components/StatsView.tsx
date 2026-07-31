import React, { useState } from "react";
import { TrendingUp, Users, ArrowDownLeft, ArrowUpRight, AlertCircle, ShoppingBag, Utensils, Zap, Package, Download, Printer, Calendar, Filter, FileSpreadsheet } from "lucide-react";
import { Customer, Transaction, TransactionType } from "../types";
import { calculateCustomerBalance, daysAgo, formatDate, formatMoney, todayISO } from "../utils/storage";
import { exportCustomersToExcel, exportReportToExcel, exportTransactionsToExcel } from "../utils/exportExcel";

interface StatsViewProps {
  customers: Customer[];
  transactions: Transaction[];
  onSelectCustomer: (customer: Customer) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  customers,
  transactions,
  onSelectCustomer,
}) => {
  const [reportPeriod, setReportPeriod] = useState<"today" | "week" | "month" | "all" | "custom">("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterType, setFilterType] = useState<"all" | TransactionType>("all");
  const [filterCustomer, setFilterCustomer] = useState("");

  const todayStr = todayISO();

  // Helper to calculate start dates for period filters
  const getPeriodFilterDates = () => {
    const now = new Date();
    if (reportPeriod === "today") {
      return { start: todayStr, end: todayStr };
    }
    if (reportPeriod === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return { start: d.toISOString().slice(0, 10), end: todayStr };
    }
    if (reportPeriod === "month") {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return { start: d.toISOString().slice(0, 10), end: todayStr };
    }
    if (reportPeriod === "custom") {
      return { start: startDate, end: endDate };
    }
    return { start: "", end: "" };
  };

  const periodDates = getPeriodFilterDates();

  // Filtered transactions for report
  const periodTransactions = transactions.filter((t) => {
    if (periodDates.start && t.date < periodDates.start) return false;
    if (periodDates.end && t.date > periodDates.end) return false;
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterCustomer && t.customerId !== filterCustomer) return false;
    return true;
  });

  // Calculate Period Totals
  const periodTotals = {
    generalDebt: periodTransactions
      .filter((t) => t.type === "general_debt" || t.type === "debt")
      .reduce((sum, t) => sum + t.amount, 0),
    dailyDebt: periodTransactions
      .filter((t) => t.type === "daily_debt")
      .reduce((sum, t) => sum + t.amount, 0),
    dailyReceivable: periodTransactions
      .filter((t) => t.type === "daily_receivable")
      .reduce((sum, t) => sum + t.amount, 0),
    totalPayments: periodTransactions
      .filter((t) => t.type === "payment")
      .reduce((sum, t) => sum + t.amount, 0),
  };

  const netBalancePeriod =
    periodTotals.generalDebt +
    periodTotals.dailyDebt +
    periodTotals.dailyReceivable -
    periodTotals.totalPayments;

  // Overall Balances
  let overallTotalDebt = 0;
  let debtorsCount = 0;

  const customerBalances = customers.map((c) => {
    const bal = calculateCustomerBalance(c.id, transactions);
    if (bal > 0) {
      overallTotalDebt += bal;
      debtorsCount++;
    }
    return { ...c, balance: bal };
  });

  // Top Debtors
  const topDebtors = customerBalances
    .filter((c) => c.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const periodLabel =
      reportPeriod === "today"
        ? "ڕۆژانە"
        : reportPeriod === "week"
        ? "هەفتانە"
        : reportPeriod === "month"
        ? "مانگانە"
        : "گشتی";
    exportReportToExcel(periodLabel, periodTotals, periodTransactions, customers);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* Title & Action Bar */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900 font-display flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#008767]" />
            ڕاپۆرت و گشتاندنی دارایی
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            ڕاپۆرتی ڕۆژانە، هەفتانە، مانگانە + هەناردەکردن بۆ ئێکسل و چاپکردن
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto no-print">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
            title="داگرتنی فایل ئێکسل"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ئێکسل (Excel)</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
            title="چاپکردن یان PDF"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ / PDF</span>
          </button>
        </div>
      </div>

      {/* Report Period Selector Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-stone-200 shadow-xs flex items-center gap-1 overflow-x-auto no-print">
        <button
          onClick={() => setReportPeriod("today")}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            reportPeriod === "today"
              ? "bg-[#008767] text-white shadow-xs"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          📅 ڕاپۆرتی ڕۆژانە
        </button>

        <button
          onClick={() => setReportPeriod("week")}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            reportPeriod === "week"
              ? "bg-[#008767] text-white shadow-xs"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          🗓️ ڕاپۆرتی هەفتانە
        </button>

        <button
          onClick={() => setReportPeriod("month")}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            reportPeriod === "month"
              ? "bg-[#008767] text-white shadow-xs"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          📊 ڕاپۆرتی مانگانە
        </button>

        <button
          onClick={() => setReportPeriod("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            reportPeriod === "all"
              ? "bg-[#008767] text-white shadow-xs"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          🌐 سەرجەم مامەڵەکان
        </button>

        <button
          onClick={() => setReportPeriod("custom")}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            reportPeriod === "custom"
              ? "bg-[#008767] text-white shadow-xs"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          ⚙️ دیاریکردنی بەروار
        </button>
      </div>

      {/* Custom Date Filter Inputs */}
      {reportPeriod === "custom" && (
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs no-print">
          <div>
            <label className="block font-bold text-stone-700 mb-1">لە بەرواری:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
            />
          </div>
          <div>
            <label className="block font-bold text-stone-700 mb-1">بۆ بەرواری:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
            />
          </div>
        </div>
      )}

      {/* Period Totals Breakdown Card */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs overflow-hidden p-5">
        <h3 className="text-sm font-bold text-stone-900 mb-3 font-display">
          کۆی چالاکییە داراییەکان (
          {reportPeriod === "today"
            ? "ئەمڕۆ"
            : reportPeriod === "week"
            ? "ئەم هەفتەیە"
            : reportPeriod === "month"
            ? "ئەم مانگە"
            : "سەرجەم"}
          )
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          
          <div className="p-3 bg-red-50 rounded-2xl border border-red-100">
            <span className="block text-[11px] font-bold text-red-700 mb-1">
              قەرزی گشتی
            </span>
            <span className="text-base font-black text-red-700 tabular">
              {formatMoney(periodTotals.generalDebt)}
            </span>
          </div>

          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
            <span className="block text-[11px] font-bold text-amber-800 mb-1">
              قەرزی کاتی
            </span>
            <span className="text-base font-black text-amber-700 tabular">
              {formatMoney(periodTotals.dailyDebt)}
            </span>
          </div>

          <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
            <span className="block text-[11px] font-bold text-blue-800 mb-1">
              داواکاری ڕۆژانە
            </span>
            <span className="text-base font-black text-blue-700 tabular">
              {formatMoney(periodTotals.dailyReceivable)}
            </span>
          </div>

          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
            <span className="block text-[11px] font-bold text-emerald-800 mb-1">
              کۆی دانەوە (وەرگیراو)
            </span>
            <span className="text-base font-black text-[#008767] tabular">
              {formatMoney(periodTotals.totalPayments)}
            </span>
          </div>

        </div>

        {/* Net Period Balance Bar */}
        <div className="mt-4 p-3 bg-stone-900 text-white rounded-2xl flex items-center justify-between text-xs font-bold">
          <span>باقی ڕافیلی ئەم ماوەیە (قەرز - دانەوە):</span>
          <span className="text-sm font-black font-mono text-emerald-400">
            {formatMoney(netBalancePeriod)}
          </span>
        </div>
      </div>

      {/* Detailed Transactions List for this Period */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs overflow-hidden">
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-bold text-stone-900 text-sm font-display">
            تەواوی مامەڵەکانی ئەم ماوەیە ({periodTransactions.length})
          </h3>
          <button
            onClick={() => exportTransactionsToExcel(periodTransactions, customers)}
            className="text-xs text-[#008767] font-bold hover:underline flex items-center gap-1"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            داگرتنی مامەڵەکان
          </button>
        </div>

        {periodTransactions.length === 0 ? (
          <p className="text-xs text-stone-400 py-10 text-center">
            هیچ مامەڵەیەک لەم بەروارەدا نییە.
          </p>
        ) : (
          <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
            {periodTransactions.map((tx) => {
              const cust = customers.find((c) => c.id === tx.customerId);
              const isPayment = tx.type === "payment";

              return (
                <div key={tx.id} className="p-3 flex items-center justify-between hover:bg-stone-50 transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-xs font-display">
                        {cust ? cust.name : "کڕیاری سڕاوە"}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPayment
                            ? "bg-emerald-100 text-emerald-800"
                            : tx.type === "daily_debt"
                            ? "bg-amber-100 text-amber-800"
                            : tx.type === "daily_receivable"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {isPayment
                          ? "دانەوە"
                          : tx.type === "daily_debt"
                          ? "قەرزی کاتی"
                          : tx.type === "daily_receivable"
                          ? "داواکاری ڕۆژانە"
                          : "قەرزی گشتی"}
                      </span>
                    </div>
                    {tx.note && <p className="text-[11px] text-stone-500 mt-0.5">{tx.note}</p>}
                    <p className="text-[10px] text-stone-400 font-mono mt-0.5">{formatDate(tx.date)}</p>
                  </div>

                  <div className={`text-sm font-black tabular ${isPayment ? "text-[#008767]" : "text-red-600"}`}>
                    {formatMoney(tx.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top Debtors Section */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-stone-900 font-display">
            🏆 بەرزترین کڕیارە قەرزارەکان
          </h3>
          <button
            onClick={() => exportCustomersToExcel(customers, transactions)}
            className="text-xs text-[#008767] font-bold hover:underline flex items-center gap-1"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            داگرتنی لیستی کڕیاران
          </button>
        </div>

        {topDebtors.length === 0 ? (
          <p className="text-xs text-stone-400 py-4 text-center">
            هیچ کڕیارێکی قەرزار نییە.
          </p>
        ) : (
          <div className="divide-y divide-stone-100">
            {topDebtors.map((c, idx) => (
              <div
                key={c.id}
                onClick={() => onSelectCustomer(c)}
                className="py-3 flex items-center justify-between cursor-pointer hover:bg-stone-50 px-2 rounded-xl transition"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-600 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm font-display">{c.name}</h4>
                    <span className="text-[11px] text-stone-400 font-mono">{c.phone}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black text-red-600 tabular">
                    {formatMoney(c.balance)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};


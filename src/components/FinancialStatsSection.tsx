import React from "react";
import {
  TrendingUp,
  Banknote,
  Zap,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  CloudCheck,
  Download,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart,
  ShieldAlert,
  Layers,
  Sparkles,
} from "lucide-react";
import { Customer, Transaction } from "../types";
import {
  calculateCustomerBalance,
  daysAgo,
  formatDate,
  formatMoney,
  getOverdueInfo,
  todayISO,
} from "../utils/storage";
import { getCreditRatingSummaryStats } from "../utils/creditRating";

interface FinancialStatsSectionProps {
  customers: Customer[];
  transactions: Transaction[];
  overdueThresholdDays?: number;
  cloudUser?: any;
  cloudStatus?: string;
}

export const FinancialStatsSection: React.FC<FinancialStatsSectionProps> = ({
  customers,
  transactions,
  overdueThresholdDays = 30,
  cloudUser,
  cloudStatus,
}) => {
  const todayStr = todayISO();

  // 1. General Debt Total & 2. Daily Debt Total (کۆی قەرزی گشتی و کۆی قەرزی ڕۆژانە)
  let totalGeneralDebt = 0;
  let totalDailyDebt = 0;

  transactions.forEach((t) => {
    if (t.type === "general_debt" || t.type === "debt") {
      totalGeneralDebt += t.amount;
    } else if (t.type === "daily_debt") {
      totalDailyDebt += t.amount;
    } else if (t.type === "payment") {
      if (t.note?.includes("ڕۆژانە")) {
        totalDailyDebt = Math.max(0, totalDailyDebt - t.amount);
      } else {
        totalGeneralDebt = Math.max(0, totalGeneralDebt - t.amount);
      }
    }
  });

  // 3. Grand Total (کۆی گشتی)
  const grandTotal = totalGeneralDebt + totalDailyDebt;

  // Today's Transactions
  const todayTxs = transactions.filter(
    (t) => t.date && t.date.slice(0, 10) === todayStr
  );

  // 4. Today's Received Payments (پارەی وەرگیراوی ئەمڕۆ)
  const todayReceivedPayments = todayTxs
    .filter((t) => t.type === "payment")
    .reduce((sum, t) => sum + t.amount, 0);

  // 5. Today's Added Debt (قەرزی زیادکراوی ئەمڕۆ)
  const todayAddedDebt = todayTxs
    .filter(
      (t) =>
        t.type === "debt" ||
        t.type === "general_debt" ||
        t.type === "daily_debt"
    )
    .reduce((sum, t) => sum + t.amount, 0);

  // 6. Today's Active Customers Count (ژمارەی کڕیارانی ئەمڕۆ)
  const todayActiveCustomersCount = new Set(
    todayTxs.map((t) => t.customerId).filter(Boolean)
  ).size;

  // 7. Today's Payments Count (ژمارەی پارەدانەوەی ئەمڕۆ)
  const todayPaymentsCount = todayTxs.filter((t) => t.type === "payment").length;

  // 8. Total Remaining Debt Balance (کۆی پارەی ماوە)
  let totalRemainingBalance = 0;
  customers.forEach((c) => {
    const bal = calculateCustomerBalance(c.id, transactions);
    if (bal > 0) totalRemainingBalance += bal;
  });

  // 9. Overdue Debts Count (ژمارەی قەرزە کۆنەکان)
  const overdueCount = customers.filter((c) => {
    const { isOverdue } = getOverdueInfo(c.id, transactions, overdueThresholdDays);
    return isOverdue;
  }).length;

  // 10. Weekly Statistics (ئاماری هەفتانە)
  const weekTxs = transactions.filter((t) => daysAgo(t.date) <= 7);
  const weekAddedDebt = weekTxs
    .filter((t) => t.type !== "payment")
    .reduce((sum, t) => sum + t.amount, 0);
  const weekPayments = weekTxs
    .filter((t) => t.type === "payment")
    .reduce((sum, t) => sum + t.amount, 0);
  const weekNetBalance = weekAddedDebt - weekPayments;

  // 11. Monthly Statistics (ئاماری مانگانە)
  const monthTxs = transactions.filter((t) => daysAgo(t.date) <= 30);
  const monthAddedDebt = monthTxs
    .filter((t) => t.type !== "payment")
    .reduce((sum, t) => sum + t.amount, 0);
  const monthPayments = monthTxs
    .filter((t) => t.type === "payment")
    .reduce((sum, t) => sum + t.amount, 0);
  const monthNetBalance = monthAddedDebt - monthPayments;

  // 12. Last Backup status
  const lastBackupStr = formatDate(todayStr);

  // 13. Firebase status
  const isFirebaseConnected =
    cloudStatus === "connected" || Boolean(cloudUser);

  return (
    <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs space-y-6 animate-fadeIn">
      
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold">
            <PieChart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-stone-900 font-display">
                ئاماری دارایی
              </h3>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 border border-indigo-200 font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                نوێبوونەوەی ئۆتۆماتیکی
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5 font-medium">
              کۆمەڵەی تەواوی ئامار، کۆی قەرزەکان، مامەڵەکانی ئەمڕۆ، هەفتانە و مانگانە
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-stone-400 bg-stone-100 px-3 py-1 rounded-xl">
          {formatDate(todayStr)}
        </span>
      </div>

      {/* Primary 3 Totals Grid (کۆی قەرزی گشتی، کۆی قەرزی ڕۆژانە، کۆی گشتی) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* 1. کۆی قەرزی گشتی */}
        <div className="bg-gradient-to-br from-rose-50 to-white p-4 rounded-2xl border border-rose-200/90 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-rose-600" />
              کۆی قەرزی گشتی
            </span>
            <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
              بەشی گشتی
            </span>
          </div>
          <div className="text-xl font-black text-rose-700 font-mono">
            {formatMoney(totalGeneralDebt)}
          </div>
        </div>

        {/* 2. کۆی قەرزی کاتی */}
        <div className="bg-gradient-to-br from-amber-50 to-white p-4 rounded-2xl border border-amber-200/90 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-600" />
              کۆی قەرزی کاتی
            </span>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
              بەشی کاتی
            </span>
          </div>
          <div className="text-xl font-black text-amber-700 font-mono">
            {formatMoney(totalDailyDebt)}
          </div>
        </div>

        {/* 3. کۆی گشتی */}
        <div className="bg-gradient-to-br from-stone-900 to-emerald-950 text-white p-4 rounded-2xl border border-emerald-800/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              کۆی گشتی
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full">
              هەردوو بەش
            </span>
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono">
            {formatMoney(grandTotal)}
          </div>
        </div>

      </div>

      {/* Today's Financial Overview (ئاماری دارایی ئەمڕۆ) */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-black text-stone-800 font-display flex items-center gap-2">
          <Clock className="w-4 h-4 text-teal-600" />
          ئاماری ئەمڕۆ ({formatDate(todayStr)})
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-right">
          
          {/* 4. پارەی وەرگیراوی ئەمڕۆ */}
          <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80">
            <span className="text-[11px] font-bold text-emerald-800 block">
              پارەی وەرگیراوی ئەمڕۆ
            </span>
            <span className="text-sm sm:text-base font-black font-mono text-emerald-700 block mt-1">
              {formatMoney(todayReceivedPayments)}
            </span>
          </div>

          {/* 5. قەرزی زیادکراوی ئەمڕۆ */}
          <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-200/80">
            <span className="text-[11px] font-bold text-rose-800 block">
              قەرزی زیادکراوی ئەمڕۆ
            </span>
            <span className="text-sm sm:text-base font-black font-mono text-rose-700 block mt-1">
              +{formatMoney(todayAddedDebt)}
            </span>
          </div>

          {/* 6. ژمارەی کڕیارانی ئەمڕۆ */}
          <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80">
            <span className="text-[11px] font-bold text-stone-700 block">
              ژمارەی کڕیارانی ئەمڕۆ
            </span>
            <span className="text-sm sm:text-base font-black font-mono text-stone-900 block mt-1">
              {todayActiveCustomersCount} کڕیار
            </span>
          </div>

          {/* 7. ژمارەی پارەدانەوەی ئەمڕۆ */}
          <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200/80">
            <span className="text-[11px] font-bold text-blue-800 block">
              ژمارەی پارەدانەوەی ئەمڕۆ
            </span>
            <span className="text-sm sm:text-base font-black font-mono text-blue-700 block mt-1">
              {todayPaymentsCount} وەسڵ
            </span>
          </div>

        </div>
      </div>

      {/* Remaining Debt & Overdue Debt Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        
        {/* 8. کۆی پارەی ماوە */}
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/90 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-stone-600 block">
              کۆی پارەی ماوە (قەرزی نەدراوە)
            </span>
            <span className="text-base font-black font-mono text-stone-900 block mt-0.5">
              {formatMoney(totalRemainingBalance)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-stone-200/80 text-stone-700 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* 9. ژمارەی قەرزە کۆنەکان */}
        <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/90 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-900 block">
              ژمارەی قەرزە کۆنەکان (لەسەر وەرزی دیاریکراو)
            </span>
            <span className="text-base font-black font-mono text-amber-800 block mt-0.5">
              {overdueCount} کڕیار
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-200/80 text-amber-800 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Customer Credit Rating Breakdown Card (ئاماری ڕێژەی متمانەی کڕیاران) */}
      {(() => {
        const creditStats = getCreditRatingSummaryStats(customers, transactions, overdueThresholdDays);
        return (
          <div className="bg-stone-50 p-4 sm:p-5 rounded-2xl border border-stone-200/90 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base">⭐</span>
                <h4 className="text-xs font-black text-stone-900 font-display">
                  ئاماری ئاستی متمانەی کڕیاران (Customer Credit Rating)
                </h4>
              </div>
              <span className="text-[10px] font-mono bg-stone-200 text-stone-700 font-bold px-2.5 py-0.5 rounded-full">
                کۆی گشتی: {creditStats.total} کڕیار
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-right">
              {/* Grade A */}
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-emerald-900">🟢 A - زۆر باش</span>
                  <span className="font-mono text-xs font-black text-emerald-700">{creditStats.countA}</span>
                </div>
                <div className="text-[10px] text-emerald-700/80 font-medium mt-1">پارەدان لە کاتی خۆیدا</div>
              </div>

              {/* Grade B */}
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-amber-900">🟡 B - باش</span>
                  <span className="font-mono text-xs font-black text-amber-700">{creditStats.countB}</span>
                </div>
                <div className="text-[10px] text-amber-700/80 font-medium mt-1">دواکەوتنی کەم</div>
              </div>

              {/* Grade C */}
              <div className="bg-orange-50 p-3 rounded-xl border border-orange-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-orange-900">🟠 C - لاواز</span>
                  <span className="font-mono text-xs font-black text-orange-700">{creditStats.countC}</span>
                </div>
                <div className="text-[10px] text-orange-700/80 font-medium mt-1">دواکەوتنی زۆر</div>
              </div>

              {/* Grade D */}
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-300">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-rose-900">🔴 D - مەترسیدار</span>
                  <span className="font-mono text-xs font-black text-rose-700">{creditStats.countD}</span>
                </div>
                <div className="text-[10px] text-rose-700/80 font-medium mt-1">قەرزی زۆر کۆن</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Weekly & Monthly Statistics (10 & 11) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        
        {/* 10. ئاماری هەفتانە */}
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/90 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <span className="text-xs font-black text-stone-900 font-display flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              ئاماری هەفتانە (٧ ڕۆژی ڕابردوو)
            </span>
            <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-lg">
              ٧ ڕۆژ
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>قەرزی زیادکراو:</span>
              <span className="font-mono font-bold text-rose-600">
                +{formatMoney(weekAddedDebt)}
              </span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>پارەی وەرگیراو:</span>
              <span className="font-mono font-bold text-emerald-600">
                -{formatMoney(weekPayments)}
              </span>
            </div>
            <div className="flex justify-between text-stone-900 font-black pt-1 border-t border-stone-200">
              <span>صافی هەفتە:</span>
              <span
                className={`font-mono ${
                  weekNetBalance > 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {formatMoney(weekNetBalance)}
              </span>
            </div>
          </div>
        </div>

        {/* 11. ئاماری مانگانە */}
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/90 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <span className="text-xs font-black text-stone-900 font-display flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              ئاماری مانگانە (٣٠ ڕۆژی ڕابردوو)
            </span>
            <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-lg">
              ٣٠ ڕۆژ
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>قەرزی زیادکراو:</span>
              <span className="font-mono font-bold text-rose-600">
                +{formatMoney(monthAddedDebt)}
              </span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>پارەی وەرگیراو:</span>
              <span className="font-mono font-bold text-emerald-600">
                -{formatMoney(monthPayments)}
              </span>
            </div>
            <div className="flex justify-between text-stone-900 font-black pt-1 border-t border-stone-200">
              <span>صافی مانگ:</span>
              <span
                className={`font-mono ${
                  monthNetBalance > 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {formatMoney(monthNetBalance)}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Backup & Firebase System Status (12 & 13) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        
        {/* 12. دوایین Backup */}
        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/90 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-extrabold text-emerald-900 block">
              دوایین Backup (پاشەکەوت)
            </span>
            <span className="text-[11px] text-emerald-700 font-medium block">
              داتای ئۆتۆماتیکی نوێکراوەتەوە: {lastBackupStr}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <Download className="w-4 h-4" />
          </div>
        </div>

        {/* 13. دۆخی Firebase */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between ${
            isFirebaseConnected
              ? "bg-blue-50/60 border-blue-200/90"
              : "bg-stone-100 border-stone-200"
          }`}
        >
          <div className="space-y-0.5">
            <span className="text-xs font-extrabold text-stone-900 block">
              دۆخی Firebase (هاوکاتکردنی بێلایت)
            </span>
            <span
              className={`text-[11px] font-bold block ${
                isFirebaseConnected ? "text-blue-700" : "text-stone-500"
              }`}
            >
              {isFirebaseConnected
                ? "پەیوەست کراوە و چالاکە 🟢"
                : "دەرهێڵ (Local Backup) ⚪"}
            </span>
          </div>
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
              isFirebaseConnected
                ? "bg-blue-100 text-blue-800"
                : "bg-stone-200 text-stone-600"
            }`}
          >
            <CloudCheck className="w-4 h-4" />
          </div>
        </div>

      </div>

    </div>
  );
};

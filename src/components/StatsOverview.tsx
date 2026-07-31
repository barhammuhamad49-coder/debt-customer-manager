import React from "react";
import { ArrowUpRight, ArrowDownLeft, AlertCircle, Filter, Banknote, Calendar, Layers, Users, Sparkles } from "lucide-react";
import { formatMoney } from "../utils/storage";
import { Customer, Transaction } from "../types";
import { computeDashboardOverview } from "../utils/debtStats";

interface StatsOverviewProps {
  customers: Customer[];
  transactions: Transaction[];
  overdueThresholdDays?: number;
  onFilterDebtorsOnly?: () => void;
  onSelectTab?: (tab: "general_debt" | "daily_debt") => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  customers,
  transactions,
  overdueThresholdDays = 30,
  onFilterDebtorsOnly,
  onSelectTab,
}) => {
  const overview = computeDashboardOverview(customers, transactions, overdueThresholdDays);
  const { generalDebt, dailyDebt, grandTotal, overdueCount } = overview;

  return (
    <div className="space-y-3 mb-4 no-print animate-fadeIn">
      
      {/* 3 Main Modern Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Card 1: کۆی قەرزی گشتی (General Debt) */}
        <div
          onClick={() => onSelectTab && onSelectTab("general_debt")}
          className={`rounded-3xl p-4 sm:p-5 border shadow-sm cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between ${
            generalDebt.isHighAlert
              ? "bg-gradient-to-br from-rose-50 via-white to-rose-50/60 border-rose-300 shadow-rose-100"
              : "bg-white border-stone-200/90 shadow-xs hover:border-red-300"
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold shrink-0 border border-red-200">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-stone-800 font-display">
                    کۆی قەرزی گشتی
                  </h3>
                  <span className="text-[10px] text-stone-500 font-bold block">
                    قەرزی درێژخایەنی کڕیاران
                  </span>
                </div>
              </div>

              {generalDebt.isHighAlert && (
                <span className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-rose-600 animate-pulse" />
                  ئاستی بەرز
                </span>
              )}
            </div>

            <div className="text-xl sm:text-2xl font-black text-red-600 font-mono tracking-tight my-2">
              {formatMoney(generalDebt.totalBalance)}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-stone-600 font-bold">
              <span className="text-[11px] flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-stone-400" />
                کڕیارانی قەرزدار:
              </span>
              <span className="font-extrabold font-mono text-stone-900 bg-stone-100 px-2 py-0.5 rounded-lg text-[11px]">
                {generalDebt.debtorsCount} کڕیار
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-500">
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                ئەمڕۆ: +{formatMoney(generalDebt.todayAdded)}
              </span>
              <span className="flex items-center gap-1 text-red-600 font-bold">
                <ArrowDownLeft className="w-3 h-3 text-red-500" />
                وەرگیراو: -{formatMoney(generalDebt.todayPaid)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: کۆی قەرزی کاتی (Temporary Debt) */}
        <div
          onClick={() => onSelectTab && onSelectTab("daily_debt")}
          className={`rounded-3xl p-4 sm:p-5 border shadow-sm cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between ${
            dailyDebt.isHighAlert
              ? "bg-gradient-to-br from-amber-50 via-white to-amber-50/60 border-amber-300 shadow-amber-100"
              : "bg-white border-stone-200/90 shadow-xs hover:border-amber-300"
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 border border-amber-200">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-stone-800 font-display">
                    کۆی قەرزی کاتی
                  </h3>
                  <span className="text-[10px] text-stone-500 font-bold block">
                    کڕیارانی کاتی
                  </span>
                </div>
              </div>

              {dailyDebt.isHighAlert && (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-600 animate-pulse" />
                  ئاستی بەرز
                </span>
              )}
            </div>

            <div className="text-xl sm:text-2xl font-black text-amber-600 font-mono tracking-tight my-2">
              {formatMoney(dailyDebt.totalBalance)}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-stone-600 font-bold">
              <span className="text-[11px] flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-stone-400" />
                قەرزدارانی ڕۆژانە:
              </span>
              <span className="font-extrabold font-mono text-stone-900 bg-stone-100 px-2 py-0.5 rounded-lg text-[11px]">
                {dailyDebt.debtorsCount} کڕیار
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-500">
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                ئەمڕۆ: +{formatMoney(dailyDebt.todayAdded)}
              </span>
              <span className="flex items-center gap-1 text-amber-700 font-bold">
                <ArrowDownLeft className="w-3 h-3 text-amber-600" />
                وەرگیراو: -{formatMoney(dailyDebt.todayPaid)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: کۆی گشتی هەردوو بەش (Grand Total) */}
        <div
          className={`rounded-3xl p-4 sm:p-5 border shadow-sm transition-all flex flex-col justify-between ${
            grandTotal.isHighAlert
              ? "bg-gradient-to-br from-stone-900 via-stone-900 to-emerald-950 text-white border-emerald-500/40"
              : "bg-gradient-to-br from-emerald-900 via-stone-900 to-stone-900 text-white border-emerald-600/30"
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold shrink-0 border border-emerald-400/30">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-emerald-200 font-display">
                    کۆی گشتی هەردوو بەش
                  </h3>
                  <span className="text-[10px] text-stone-300 font-bold block">
                    گشتی + ڕۆژانە
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full font-mono">
                کۆی پاشماوە
              </span>
            </div>

            <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight my-2">
              {formatMoney(grandTotal.totalBalance)}
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-stone-200 font-bold">
              <span className="text-[11px] flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                سەرجەم قەرزداران:
              </span>
              <span className="font-extrabold font-mono text-white bg-white/10 border border-white/15 px-2 py-0.5 rounded-lg text-[11px]">
                {grandTotal.debtorsCount} کڕیار
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-300">
              <span className="flex items-center gap-1 text-emerald-300 font-bold">
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                سەرجەم زیادکراو: +{formatMoney(grandTotal.todayAdded)}
              </span>
              <span className="flex items-center gap-1 text-teal-300 font-bold">
                <ArrowDownLeft className="w-3 h-3 text-teal-400" />
                سەرجەم وەرگیراو: -{formatMoney(grandTotal.todayPaid)}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Warning Bar if overdue debt exists */}
      {overdueCount > 0 && (
        <div className="bg-amber-50/80 border border-amber-300/80 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs font-bold text-amber-950 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-base animate-bounce">⚠️</span>
            <span>
              ئاگاداری: <span className="font-mono text-amber-900 font-black">{overdueCount}</span> کڕیار قەرزی دواکەوتوویان هەیە.
            </span>
          </div>

          {onFilterDebtorsOnly && (
            <button
              onClick={onFilterDebtorsOnly}
              className="flex items-center gap-1 text-amber-900 hover:text-amber-950 underline font-extrabold transition"
              title="پیشاندانی فلتەری قەرزداران"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>پیشاندان</span>
            </button>
          )}
        </div>
      )}

    </div>
  );
};

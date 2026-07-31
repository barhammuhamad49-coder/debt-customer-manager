import React from "react";
import { Calendar, Users, ArrowUpRight, ArrowDownLeft, AlertCircle, Clock } from "lucide-react";
import { Customer, Transaction } from "../types";
import { formatMoney } from "../utils/storage";
import { computeDashboardOverview } from "../utils/debtStats";

interface DailyDebtHeaderCardProps {
  customers: Customer[];
  transactions: Transaction[];
  overdueThresholdDays?: number;
}

export const DailyDebtHeaderCard: React.FC<DailyDebtHeaderCardProps> = ({
  customers,
  transactions,
  overdueThresholdDays = 30,
}) => {
  const overview = computeDashboardOverview(customers, transactions, overdueThresholdDays);
  const { totalBalance, debtorsCount, todayAdded, todayPaid, isHighAlert } = overview.dailyDebt;

  return (
    <div
      className={`rounded-3xl p-5 border shadow-sm transition-all duration-300 ${
        isHighAlert
          ? "bg-gradient-to-br from-amber-950 via-stone-900 to-amber-900 text-white border-amber-500/50 shadow-amber-950/20"
          : "bg-gradient-to-br from-amber-900 via-stone-900 to-stone-950 text-white border-amber-600/30"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Main Title & Total Amount */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-extrabold font-display text-amber-200">
              کۆی قەرزی کاتی
            </h2>
            {isHighAlert && (
              <span className="text-[10px] font-bold bg-amber-500/30 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-400 animate-pulse" />
                ئاستی بەرز
              </span>
            )}
          </div>

          <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white pt-1">
            {formatMoney(totalBalance)}
          </div>
        </div>

        {/* Right Info Badges */}
        <div className="flex items-center gap-2 flex-wrap sm:justify-end">
          {/* Debtors Count */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl px-3.5 py-2 border border-white/15 flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-300" />
            <div>
              <div className="text-[10px] text-stone-300 font-bold">قەرزدارانی کاتی</div>
              <div className="text-sm font-extrabold font-mono text-white">{debtorsCount} کڕیار</div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Stats Row */}
      <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-3 text-xs">
        <div className="bg-black/20 rounded-xl p-2.5 flex items-center justify-between border border-white/5">
          <span className="text-stone-300 text-[11px] font-bold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            زیادکراوی ئەمڕۆ:
          </span>
          <span className="font-extrabold font-mono text-emerald-300">
            {formatMoney(todayAdded)}
          </span>
        </div>

        <div className="bg-black/20 rounded-xl p-2.5 flex items-center justify-between border border-white/5">
          <span className="text-stone-300 text-[11px] font-bold flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-amber-400" />
            وەرگیراوی ئەمڕۆ:
          </span>
          <span className="font-extrabold font-mono text-amber-300">
            {formatMoney(todayPaid)}
          </span>
        </div>
      </div>
    </div>
  );
};

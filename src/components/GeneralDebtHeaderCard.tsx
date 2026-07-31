import React from "react";
import { ArrowDownLeft, Scale, UserCheck, BookOpen } from "lucide-react";
import { Customer, Transaction } from "../types";
import { formatMoney, calculateCustomerBalance } from "../utils/storage";

interface GeneralDebtHeaderCardProps {
  customers: Customer[];
  transactions: Transaction[];
  overdueThresholdDays?: number;
  onFilterDebtorsOnly?: () => void;
}

export const GeneralDebtHeaderCard: React.FC<GeneralDebtHeaderCardProps> = ({
  customers,
  transactions,
}) => {
  let totalGivenDebt = 0;
  let totalReceivedDebt = 0;

  transactions.forEach((t) => {
    if (t.type === "payment") {
      totalReceivedDebt += t.amount;
    } else {
      totalGivenDebt += t.amount;
    }
  });

  const totalRemainingDebt = customers.reduce(
    (sum, c) => sum + Math.max(0, calculateCustomerBalance(c.id, transactions)),
    0
  );

  const debtorsCount = customers.filter(
    (c) => calculateCustomerBalance(c.id, transactions) > 0
  ).length;

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-3.5 sm:p-4 font-sans text-stone-900 mb-3">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
          <h3 className="text-xs sm:text-sm font-black font-display text-stone-800">
            پوختەی قەرزی گشتی (کۆی گشتی حسابات)
          </h3>
        </div>
        <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full">
          {customers.length} کڕیار
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-stone-100">
        
        {/* 📕 قەرزی گشتی */}
        <div className="pt-2 sm:pt-0 px-2 flex flex-col items-start text-right">
          <div className="flex items-center gap-1.5 text-stone-500 text-[11px] sm:text-xs font-bold mb-1">
            <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <span className="truncate">📕 قەرزی گشتی</span>
          </div>
          <div className="text-xs sm:text-base font-black font-mono text-rose-600 dir-ltr text-right truncate w-full">
            {formatMoney(totalGivenDebt)}
          </div>
        </div>

        {/* 💵 پارەی واصل */}
        <div className="pt-2 sm:pt-0 px-2 flex flex-col items-start text-right">
          <div className="flex items-center gap-1.5 text-stone-500 text-[11px] sm:text-xs font-bold mb-1">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
            <span className="truncate">💵 پارەی واصل</span>
          </div>
          <div className="text-xs sm:text-base font-black font-mono text-emerald-700 dir-ltr text-right truncate w-full">
            {formatMoney(totalReceivedDebt)}
          </div>
        </div>

        {/* ⚖️ باڵانسی ماوە */}
        <div className="pt-2 sm:pt-0 px-2 flex flex-col items-start text-right">
          <div className="flex items-center gap-1.5 text-stone-500 text-[11px] sm:text-xs font-bold mb-1">
            <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Scale className="w-3.5 h-3.5" />
            </div>
            <span className="truncate">⚖️ باڵانسی ماوە</span>
          </div>
          <div className="text-xs sm:text-base font-black font-mono text-amber-800 dir-ltr text-right truncate w-full">
            {formatMoney(totalRemainingDebt)}
          </div>
        </div>

        {/* 👥 ژمارەی قەرزداران */}
        <div className="pt-2 sm:pt-0 px-2 flex flex-col items-start text-right">
          <div className="flex items-center gap-1.5 text-stone-500 text-[11px] sm:text-xs font-bold mb-1">
            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <span className="truncate">👥 ژمارەی قەرزداران</span>
          </div>
          <div className="text-xs sm:text-base font-black font-mono text-stone-900 dir-ltr text-right truncate w-full">
            {debtorsCount} کڕیار
          </div>
        </div>

      </div>
    </div>
  );
};




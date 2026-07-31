import React, { useState } from "react";
import { Bell, AlertTriangle, ChevronDown, ChevronUp, Send, Clock, Sparkles } from "lucide-react";
import { Customer, Transaction } from "../types";
import { formatMoney, getOverdueInfo } from "../utils/storage";

interface OverdueNotificationBannerProps {
  customers: Customer[];
  transactions: Transaction[];
  overdueThresholdDays?: number;
  onOpenSendReminder: (customer: Customer, balance: number, overdueDays: number) => void;
  onSelectCustomer?: (customer: Customer) => void;
}

export const OverdueNotificationBanner: React.FC<OverdueNotificationBannerProps> = ({
  customers,
  transactions,
  overdueThresholdDays = 30,
  onOpenSendReminder,
  onSelectCustomer,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter customers with overdue debt
  const overdueList = customers
    .map((c) => {
      const info = getOverdueInfo(c.id, transactions, overdueThresholdDays);
      return { customer: c, ...info };
    })
    .filter((item) => item.isOverdue)
    .sort((a, b) => b.overdueDays - a.overdueDays);

  if (overdueList.length === 0) return null;

  const totalOverdueAmount = overdueList.reduce((sum, item) => sum + item.balance, 0);

  return (
    <div className="bg-gradient-to-r from-amber-900 via-stone-900 to-amber-950 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-amber-600/40 space-y-3 my-4 animate-fadeIn">
      
      {/* Top Bar Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base font-display text-amber-200">
                ئاگادارکردنەوەی قەرزی کۆن
              </h3>
              <span className="text-[10px] font-extrabold bg-amber-500/30 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-full font-mono">
                {overdueList.length} کڕیار
              </span>
            </div>
            <p className="text-[11px] text-amber-100/80 mt-0.5">
              قەرزی زیاتر لە {overdueThresholdDays} ڕۆژ دواکەوتوو:{" "}
              <span className="font-bold font-mono text-amber-300">
                {formatMoney(totalOverdueAmount)}
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 bg-white/10 hover:bg-white/20 text-amber-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
        >
          <span className="hidden sm:inline">
            {isExpanded ? "داخستنی لیست" : "پیشاندانی لیست"}
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Detailed List */}
      {isExpanded && (
        <div className="space-y-2 pt-2 border-t border-amber-500/20 max-h-72 overflow-y-auto pr-1">
          {overdueList.map(({ customer, balance, overdueDays }) => (
            <div
              key={customer.id}
              className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-amber-400/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition"
            >
              {/* Customer Info */}
              <div
                onClick={() => onSelectCustomer && onSelectCustomer(customer)}
                className="cursor-pointer flex-1"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-white font-display hover:text-amber-300 transition">
                    {customer.name}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-200 bg-amber-900/80 border border-amber-500/50 px-2 py-0.5 rounded-full font-mono">
                    <Clock className="w-3 h-3 text-amber-400" />
                    دواکەوتوو: {overdueDays} ڕۆژ
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="text-amber-200/80">بڕی قەرز:</span>
                  <span className="font-extrabold font-mono text-amber-300">
                    {formatMoney(balance)}
                  </span>
                  {customer.phone && (
                    <span className="text-[10px] text-amber-300/70 font-mono">
                      ({customer.phone})
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => onOpenSendReminder(customer, balance, overdueDays)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md shrink-0 active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ناردنی بیرخستنەوە 📲</span>
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

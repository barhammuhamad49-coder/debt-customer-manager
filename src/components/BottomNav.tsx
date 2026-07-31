import React from "react";
import { Home, BarChart2, Calendar, ShoppingBag, Settings, Plus, Wallet } from "lucide-react";

export type NavTab =
  | "home"
  | "reports"
  | "daily_debt"
  | "daily_requests"
  | "settings"
  | "items"
  | "customers";

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenQuickRecord: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenQuickRecord,
}) => {
  return (
    <>
      {/* Floating Action Button (FAB) Bottom Left as seen in screenshot */}
      <div className="fixed bottom-20 left-4 z-40 no-print">
        <button
          onClick={onOpenQuickRecord}
          className="w-14 h-14 bg-[#008767] hover:bg-[#007256] text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-900/40 transition active:scale-95 border-2 border-white/20"
          title="زیادکردنی مامەڵەی نوێ"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      </div>

      {/* Bottom Bar Navigation with clean responsive tabs */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-stone-200/90 shadow-lg px-2 py-1.5 no-print">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-1 overflow-x-auto">
          
          {/* 1. سەرەکی (Main / Home) */}
          <button
            onClick={() => onSelectTab("home")}
            className={`flex-1 min-w-[50px] flex flex-col items-center gap-0.5 py-1 rounded-xl transition ${
              activeTab === "home"
                ? "text-[#008767] font-bold"
                : "text-stone-400 hover:text-stone-600 font-medium"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] whitespace-nowrap">سەرەکی</span>
          </button>

          {/* 2. قەرزی گشتی (General Debt) */}
          <button
            onClick={() => onSelectTab("customers")}
            className={`flex-1 min-w-[60px] flex flex-col items-center gap-0.5 py-1 rounded-xl transition ${
              activeTab === "customers"
                ? "text-purple-600 font-bold"
                : "text-stone-400 hover:text-stone-600 font-medium"
            }`}
          >
            <Wallet className="w-5 h-5 text-purple-600" />
            <span className="text-[10px] whitespace-nowrap">قەرزی گشتی</span>
          </button>

          {/* 3. قەرزی کاتی (Temporary Debt) */}
          <button
            onClick={() => onSelectTab("daily_debt")}
            className={`flex-1 min-w-[60px] flex flex-col items-center gap-0.5 py-1 rounded-xl transition ${
              activeTab === "daily_debt"
                ? "text-amber-600 font-bold"
                : "text-stone-400 hover:text-stone-600 font-medium"
            }`}
          >
            <Calendar className="w-5 h-5 text-amber-600" />
            <span className="text-[10px] whitespace-nowrap">قەرزی کاتی</span>
          </button>

          {/* 4. داواکاری ڕۆژانە (Daily Requests) */}
          <button
            onClick={() => onSelectTab("daily_requests")}
            className={`flex-1 min-w-[65px] flex flex-col items-center gap-0.5 py-1 rounded-xl transition ${
              activeTab === "daily_requests"
                ? "text-blue-600 font-bold"
                : "text-stone-400 hover:text-stone-600 font-medium"
            }`}
          >
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            <span className="text-[10px] whitespace-nowrap">داواکاری ڕۆژانە</span>
          </button>

          {/* 5. ڕاپۆرت (Reports) */}
          <button
            onClick={() => onSelectTab("reports")}
            className={`flex-1 min-w-[50px] flex flex-col items-center gap-0.5 py-1 rounded-xl transition ${
              activeTab === "reports"
                ? "text-[#008767] font-bold"
                : "text-stone-400 hover:text-stone-600 font-medium"
            }`}
          >
            <BarChart2 className="w-5 h-5" />
            <span className="text-[10px] whitespace-nowrap">ڕاپۆرت</span>
          </button>

          {/* 6. ڕێکخستن (Settings) */}
          <button
            onClick={() => onSelectTab("settings")}
            className={`flex-1 min-w-[50px] flex flex-col items-center gap-0.5 py-1 rounded-xl transition ${
              activeTab === "settings"
                ? "text-[#008767] font-bold"
                : "text-stone-400 hover:text-stone-600 font-medium"
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] whitespace-nowrap">ڕێکخستن</span>
          </button>

        </div>
      </div>
    </>
  );
};

import React from "react";
import { ShoppingCart, Download, Printer, Calculator, Search, SlidersHorizontal, User, Plus, Trash2, Cloud, CloudCheck, CloudOff, RefreshCw, LogIn, Mic } from "lucide-react";
import { UserProfile } from "../types";

interface HeaderBarProps {
  activeUser: UserProfile;
  cloudUser?: any;
  cloudStatus?: "synced" | "syncing" | "offline" | "logged_out" | "error";
  searchQuery: string;
  trashCount?: number;
  onSearchChange: (q: string) => void;
  onExportExcel: () => void;
  onPrintReport: () => void;
  onOpenExportReport?: () => void;
  onOpenCalculator: () => void;
  onOpenRecycleBin?: () => void;
  onOpenFilterModal?: () => void;
  onOpenAddCustomer: () => void;
  onOpenUserSwitch: () => void;
  onLoginGoogle?: () => void;
  onOpenBackup?: () => void;
  onOpenVoiceMode?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeUser,
  cloudUser,
  cloudStatus = "logged_out",
  searchQuery,
  trashCount = 0,
  onSearchChange,
  onExportExcel,
  onPrintReport,
  onOpenExportReport,
  onOpenCalculator,
  onOpenRecycleBin,
  onOpenFilterModal,
  onOpenAddCustomer,
  onOpenUserSwitch,
  onLoginGoogle,
  onOpenBackup,
  onOpenVoiceMode,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#F8F8F5] border-b border-stone-200/80 no-print">
      <div className="max-w-4xl mx-auto px-4 py-3 space-y-2">
        
        {/* Top Header Row */}
        <div className="flex items-center justify-between">
          
          {/* Left Actions: Download, Print, Calculator, Recycle Bin, Cloud Backup */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenExportReport || onExportExcel}
              className="w-10 h-10 rounded-full bg-white border border-stone-200 text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center shadow-xs transition active:scale-95"
              title="دابەزاندنی ڕاپۆرتی Excel / PDF"
            >
              <Download className="w-4 h-4 text-emerald-600" />
            </button>

            <button
              onClick={onOpenExportReport || onPrintReport}
              className="w-10 h-10 rounded-full bg-white border border-stone-200 text-stone-600 hover:text-blue-700 hover:bg-blue-50 flex items-center justify-center shadow-xs transition active:scale-95"
              title="چاپکردنی ڕاپۆرت و PDF"
            >
              <Printer className="w-4 h-4 text-blue-600" />
            </button>

            <button
              onClick={onOpenCalculator}
              className="w-10 h-10 rounded-full bg-white border border-stone-200 text-stone-600 hover:text-amber-700 hover:bg-amber-50 flex items-center justify-center shadow-xs transition active:scale-95"
              title="ژمێرەر (حاسبە)"
            >
              <Calculator className="w-4 h-4 text-amber-600" />
            </button>

            {onOpenRecycleBin && (
              <button
                onClick={onOpenRecycleBin}
                className="w-10 h-10 rounded-full bg-white border border-stone-200 text-stone-600 hover:text-red-700 hover:bg-red-50 flex items-center justify-center shadow-xs transition active:scale-95 relative"
                title="تەنەکەی زبڵ (سڕاوەکان)"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                {trashCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                    {trashCount > 9 ? "9+" : trashCount}
                  </span>
                )}
              </button>
            )}

            {/* Cloud Status Badge / Button */}
            {cloudUser ? (
              <button
                onClick={onOpenBackup}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-full text-xs font-bold transition shadow-2xs"
                title={`پەیوەستە بە Google (${cloudUser.email}) - بکلیپ بکه بۆ بکئەپ`}
              >
                {cloudStatus === "syncing" ? (
                  <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin" />
                ) : (
                  <CloudCheck className="w-4 h-4 text-sky-600" />
                )}
                <span className="max-w-[110px] truncate">{cloudUser.email?.split("@")[0]}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            ) : (
              <button
                onClick={onLoginGoogle}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full text-xs font-bold transition shadow-xs active:scale-95"
                title="چوونەژوورەوە بە Gmail بۆ هاوکاتکردنی خۆکار لە Cloud"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>چوونەژوورەوە بە Gmail</span>
              </button>
            )}
          </div>

          {/* Right Brand Title & Active User Badge */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenUserSwitch}
              className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#008767] border border-emerald-200 px-3 py-1.5 rounded-2xl text-xs font-bold transition shadow-2xs active:scale-95"
              title="گۆڕینی بەکارهێنەر"
            >
              <User className="w-3.5 h-3.5" />
              <span>{activeUser.name}</span>
            </button>

            <div className="text-right">
              <span className="block text-[11px] text-stone-400 font-medium leading-none mb-1">
                هەژمار
              </span>
              <h1 className="text-lg sm:text-xl font-black text-stone-900 font-display tracking-tight leading-none">
                قەرزی دووکان
              </h1>
            </div>

            <div
              onClick={onOpenUserSwitch}
              className="w-11 h-11 rounded-full bg-emerald-100/90 text-[#008767] flex items-center justify-center shadow-inner cursor-pointer hover:bg-emerald-200 transition"
              title="گۆڕینی بەکارهێنەر"
            >
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>

        </div>

        {/* Mobile Google Auth Bar (if logged out or logged in) */}
        <div className="sm:hidden flex items-center justify-between gap-2 p-2 bg-white rounded-2xl border border-stone-200/80">
          {cloudUser ? (
            <button
              onClick={onOpenBackup}
              className="flex items-center gap-2 text-xs font-bold text-sky-900 w-full justify-between px-2"
            >
              <div className="flex items-center gap-2">
                <CloudCheck className="w-4 h-4 text-sky-600" />
                <span className="truncate max-w-[180px]">Cloud: {cloudUser.email}</span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono">
                پارێزراوە
              </span>
            </button>
          ) : (
            <button
              onClick={onLoginGoogle}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>چوونەژوورەوە بە Gmail بۆ هاوکاتکردن لە Cloud</span>
            </button>
          )}
        </div>

        {/* Full-width Search Input Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="🔍 گەڕان بە ناوی قەرزدار، ژمارەی مۆبایل یان کۆدی کڕیار..."
            className="w-full pr-11 pl-20 py-3 bg-white border border-stone-200 rounded-2xl text-xs sm:text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#008767]/20 focus:border-[#008767] shadow-xs transition"
          />
          {/* Search Icon Right */}
          <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-stone-400" />

          {/* Left Buttons: Voice Mode & Filter */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {onOpenVoiceMode && (
              <button
                onClick={onOpenVoiceMode}
                className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                title="تۆمارکردن یان گەڕان بە دەنگ 🎤 (Voice Mode)"
              >
                <Mic className="w-4 h-4 animate-pulse" />
              </button>
            )}

            <button
              onClick={onOpenFilterModal}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition"
              title="فلتەرکردنی پێشکەوتوو"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </header>
  );
};



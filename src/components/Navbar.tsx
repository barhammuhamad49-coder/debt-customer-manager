import React, { useState } from "react";
import { Store, User, ChevronDown, Download, RefreshCw, Moon, Sun, BookOpen } from "lucide-react";
import { UserProfile } from "../types";
import { USERS } from "../data/initialData";

interface NavbarProps {
  activeUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
  onOpenBackup: () => void;
  paperMode: boolean;
  onTogglePaperMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeUser,
  onSelectUser,
  onOpenBackup,
  paperMode,
  onTogglePaperMode,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-stone-900 text-stone-100 shadow-md border-b border-stone-800 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* App Title & Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-inner flex items-center justify-center">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-display tracking-wide text-amber-100">
                دفتەری حسابی دوکان
              </h1>
              <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                نسخەی ٢٠٢٦
              </span>
            </div>
            <p className="text-xs text-stone-400 hidden sm:block">
              تۆمارکردنی قەرز و مامەڵەی کڕیاران
            </p>
          </div>
        </div>

        {/* Right Controls: User Switcher, Paper Style Toggle, Backup */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Paper Notebook Mode Toggle */}
          <button
            onClick={onTogglePaperMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              paperMode
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-stone-800 text-stone-300 hover:bg-stone-700"
            }`}
            title="گۆڕینی شێوازی بینین بۆ دفتەری کاغەزی"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden md:inline">شێوازی دفتەر</span>
          </button>

          {/* Backup/Export */}
          <button
            onClick={onOpenBackup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white transition"
            title="پاشەکەوتکردن و هاوردەکردنی داتا"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">پاشەکەوت</span>
          </button>

          {/* Active User Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 transition"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-sm"
                style={{ backgroundColor: activeUser.color }}
              >
                {activeUser.initial}
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-stone-200 leading-tight">
                  {activeUser.name}
                </div>
                <div className="text-[10px] text-stone-400">
                  {activeUser.role}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-stone-400" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute left-0 mt-2 w-56 bg-stone-800 border border-stone-700 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 text-[11px] font-medium text-stone-400 border-b border-stone-700">
                  بەکارهێنەری دیاریکراو (کاسبکار):
                </div>
                {USERS.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSelectUser(u);
                      setShowUserMenu(false);
                    }}
                    className={`w-full text-right px-3 py-2 flex items-center justify-between text-xs transition hover:bg-stone-700/60 ${
                      u.id === activeUser.id ? "bg-stone-700/80 font-bold text-amber-300" : "text-stone-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[11px] font-bold"
                        style={{ backgroundColor: u.color }}
                      >
                        {u.initial}
                      </div>
                      <div>
                        <div className="font-semibold">{u.name}</div>
                        <div className="text-[10px] text-stone-400">{u.role}</div>
                      </div>
                    </div>
                    {u.id === activeUser.id && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};

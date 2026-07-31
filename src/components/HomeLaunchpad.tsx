import React from "react";
import { Zap, ShoppingBag, ArrowLeft, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { NavTab } from "./BottomNav";

interface HomeLaunchpadProps {
  onSelectTab: (tab: NavTab) => void;
  userName?: string;
}

export const HomeLaunchpad: React.FC<HomeLaunchpadProps> = ({
  onSelectTab,
  userName = "بەکارهێنەر",
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-fadeIn">
      
      {/* Top Welcome / Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-purple-950 text-white rounded-3xl p-6 shadow-md border border-stone-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 -mt-8 -ml-8 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              سیستەمی بەڕێوەبردنی خێرا
            </span>
            <span className="text-xs text-stone-300 font-medium">
              سڵاو، {userName} 👋
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight">
            بەخێربێیت بۆ لاپەڕەی سەرەکی
          </h1>

          <p className="text-xs sm:text-sm text-stone-300 max-w-xl font-medium leading-relaxed">
            تکایە بەشێک لە بەشەکانی خوارەوە هەڵبژێرە بۆ دەستپێکردنی کار و تۆمارکردنی مامەڵەکانت.
          </p>
        </div>
      </div>

      {/* Main Sections Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-extrabold text-stone-900 font-display flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-700" />
            بەشەکانی سەرەکی (دەستپێکردنی کار)
          </h2>
          <span className="text-xs text-stone-400 font-medium">۳ بەشی بنەڕەتی</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* 1. قەرزی گشتی (General Debt) */}
          <div
            onClick={() => onSelectTab("customers")}
            className="group bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs hover:shadow-md hover:border-purple-300 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 active:scale-[0.99]"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <Wallet className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-extrabold bg-purple-100/80 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full inline-block mb-1">
                  بەشی یەکەم
                </span>
                <h3 className="text-base font-black text-stone-900 font-display group-hover:text-purple-700 transition-colors">
                  قەرزی گشتی
                </h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  تۆمارکردن و بەڕێوەبردنی حساباتی قەرزی گشتی کڕیاران و پوختەی سەرجەم وەسڵەکان.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-purple-700 group-hover:translate-x-[-2px] transition-transform">
              <span>دەستپێکردنی کار</span>
              <ArrowLeft className="w-4 h-4" />
            </div>
          </div>

          {/* 2. قەرزی کاتی (Temporary Debt) */}
          <div
            onClick={() => onSelectTab("daily_debt")}
            className="group bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs hover:shadow-md hover:border-amber-300 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 active:scale-[0.99]"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-extrabold bg-amber-100/80 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full inline-block mb-1">
                  بەشی دووەم
                </span>
                <h3 className="text-base font-black text-stone-900 font-display group-hover:text-amber-700 transition-colors">
                  قەرزی کاتی
                </h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  تۆمارکردنی مامەڵەی کڕیارانی کاتی کە لاپەڕەی تایبەت بە خۆیانیان نییە.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-amber-700 group-hover:translate-x-[-2px] transition-transform">
              <span>دەستپێکردنی کار</span>
              <ArrowLeft className="w-4 h-4" />
            </div>
          </div>

          {/* 3. داواکاری ڕۆژانە (Daily Requests) */}
          <div
            onClick={() => onSelectTab("daily_requests")}
            className="group bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 active:scale-[0.99]"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-extrabold bg-blue-100/80 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full inline-block mb-1">
                  بەشی سێیەم
                </span>
                <h3 className="text-base font-black text-stone-900 font-display group-hover:text-blue-700 transition-colors">
                  داواکاری ڕۆژانە
                </h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  تۆمارکردن، چاودێریکردن و تەواوکردنی کاڵا و داواکارییە ڕۆژانەیییەکانی کڕیاران.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-blue-700 group-hover:translate-x-[-2px] transition-transform">
              <span>دەستپێکردنی کار</span>
              <ArrowLeft className="w-4 h-4" />
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

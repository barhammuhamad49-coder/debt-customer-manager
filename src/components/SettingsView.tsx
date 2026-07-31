import React, { useState, useEffect } from "react";
import { Settings, Shield, Download, BookOpen, RefreshCw, Store, CheckCircle2, Trash2, CloudCheck, LogIn, LogOut, Bell, Clock, ArrowLeft, FileSpreadsheet, Zap, AlertCircle, Lock, KeyRound, Fingerprint, Smile, ShieldAlert, ShieldCheck, Smartphone, Check, UserCheck, AlertTriangle, Hash } from "lucide-react";
import { Customer, CustomerIdConfig, Transaction, UserProfile } from "../types";
import { calculateCustomerBalance, DEFAULT_CUSTOMER_ID_CONFIG, formatDate, formatCustomerId, formatMoney, getOverdueInfo, todayISO } from "../utils/storage";
import { FinancialStatsSection } from "./FinancialStatsSection";
import { UserSecurityConfig, SecurityFailedLog, checkBiometricsSupport } from "../utils/security";
import { ChangePasswordModal } from "./ChangePasswordModal";

interface SettingsViewProps {
  activeUser: UserProfile;
  allUsers?: UserProfile[];
  paperMode: boolean;
  customers?: Customer[];
  transactions?: Transaction[];
  trashCount?: number;
  cloudUser?: any;
  cloudStatus?: string;
  overdueThresholdDays?: number;
  customerIdConfig?: CustomerIdConfig;
  userSecurityConfig?: UserSecurityConfig;
  securityLogs?: SecurityFailedLog[];
  onTogglePaperMode: () => void;
  onOpenBackup: () => void;
  onOpenRecycleBin?: () => void;
  onLoginGoogle?: () => void;
  onLogoutGoogle?: () => void;
  onChangeOverdueThresholdDays?: (days: number) => void;
  onChangeCustomerIdConfig?: (config: CustomerIdConfig) => void;
  onSelectTab?: (tab: any) => void;
  onOpenExportReport?: (customerId?: string, sectionType?: "all" | "general_debt" | "daily_debt" | "daily_request") => void;
  onUpdateUserSecurityConfig?: (updatedConfig: UserSecurityConfig) => void;
  onLockAppNow?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  activeUser,
  allUsers = [],
  paperMode,
  customers = [],
  transactions = [],
  trashCount = 0,
  cloudUser,
  cloudStatus,
  overdueThresholdDays = 30,
  customerIdConfig = DEFAULT_CUSTOMER_ID_CONFIG,
  userSecurityConfig = {
    userId: activeUser.id,
    isPasswordSet: false,
    enableFingerprint: false,
    enableFaceUnlock: false,
    autoLockMinutes: 5,
    rememberMe: false,
  },
  securityLogs = [],
  onTogglePaperMode,
  onOpenBackup,
  onOpenRecycleBin,
  onLoginGoogle,
  onLogoutGoogle,
  onChangeOverdueThresholdDays,
  onChangeCustomerIdConfig,
  onSelectTab,
  onOpenExportReport,
  onUpdateUserSecurityConfig,
  onLockAppNow,
}) => {
  const todayStr = todayISO();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [biometricSupportInfo, setBiometricSupportInfo] = useState<{ supported: boolean; platformAuthenticator: boolean }>({
    supported: false,
    platformAuthenticator: false,
  });

  useEffect(() => {
    checkBiometricsSupport().then((res) => {
      setBiometricSupportInfo(res);
    });
  }, []);

  // Compute General Debt metrics
  const generalDebtTransactions = transactions.filter(
    (t) => t.type === "general_debt" || t.type === "debt" || (t.type === "payment" && !t.note?.includes("ڕۆژانە"))
  );

  let totalGeneralDebt = 0;
  const generalDebtors = customers.filter((c) => {
    const bal = calculateCustomerBalance(c.id, transactions);
    if (bal > 0) {
      totalGeneralDebt += bal;
      return true;
    }
    return false;
  });

  const overdueGeneralDebtors = customers.filter((c) => {
    const { isOverdue } = getOverdueInfo(c.id, transactions, overdueThresholdDays);
    return isOverdue;
  });

  // Compute Daily Debt metrics
  const todayDailyTxs = transactions.filter((t) => {
    if (!t.date) return false;
    return t.date.slice(0, 10) === todayStr;
  });

  const todayDailyDebtTotal = todayDailyTxs
    .filter((t) => t.type === "daily_debt")
    .reduce((sum, t) => sum + t.amount, 0);

  const todayDailyPaymentTotal = todayDailyTxs
    .filter((t) => t.type === "payment" && t.note?.includes("ڕۆژانە"))
    .reduce((sum, t) => sum + t.amount, 0);

  const dailyDebtorsList = customers.filter((c) => {
    const cTxs = transactions.filter((t) => t.customerId === c.id);
    const hasDaily = cTxs.some((t) => t.type === "daily_debt");
    const bal = calculateCustomerBalance(c.id, transactions);
    return hasDaily && bal > 0;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs">
        <h2 className="text-xl font-black text-stone-900 font-display flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#008767]" />
          ڕێکخستنی سیستەم و داتا
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          کۆنترۆڵکردنی پاراستن، پاشەکەوتکردن، ئاماری دارایی، قەرزی گشتی و ڕۆژانە و هاوکاتکردن
        </p>
      </div>

      {/* 0. PROFESSIONAL SECURITY SYSTEM SECTION (پاراستنی بەرنامە) */}
      <div className="bg-gradient-to-br from-slate-900 via-stone-900 to-zinc-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-stone-800 space-y-5">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#008767] to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-[#008767]/20 border border-emerald-400/30 shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black font-display text-white">
                  پاراستنی بەرنامە (Professional App Security)
                </h3>
                <span className="text-[10px] font-extrabold bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2.5 py-0.5 rounded-full">
                  پارێزراوە 🔒
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                تایبەت بە بەکارهێنەری چالاک: <strong className="text-emerald-300 font-display">{activeUser.name} ({activeUser.role})</strong>
              </p>
            </div>
          </div>

          {onLockAppNow && (
            <button
              onClick={onLockAppNow}
              className="px-4 py-2.5 bg-rose-600/90 hover:bg-rose-600 text-white font-extrabold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 border border-rose-500/40 shrink-0"
            >
              <Lock className="w-4 h-4" />
              <span>قوفڵکردنی دەستبەجێ (Lock Now)</span>
            </button>
          )}
        </div>

        {/* User Multi-User Independence Warning Notice */}
        <div className="p-3.5 bg-stone-800/70 border border-stone-700/80 rounded-2xl flex items-start gap-3 text-xs text-stone-300">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <span className="font-extrabold text-stone-100 block">
              پاراستنی سەربەخۆ بۆ سەرجەم {allUsers.length || 3} بەکارهێنەرەکە:
            </span>
            <p className="text-[11px] text-stone-400">
              هەر یەک لە بەکارهێنەران (سەرپەرشتیار، کاشێر، ژمێریار) خاوەنی پاسوورد و پەنجەمۆری سەربەخۆی خۆیەتی و ڕێکخستنی یەکێکیان کاریگەری لەسەر ئەوانی تر دروست ناکات.
            </p>
          </div>
        </div>

        {/* 1. Biometric & Authentication Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          
          {/* Fingerprint Toggle Card */}
          <div className="bg-stone-800/80 p-4 rounded-2xl border border-stone-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-stone-100 font-display">
                    پەنجەمۆر (Fingerprint)
                  </h4>
                  <span className="text-[10px] text-stone-400 font-medium block">
                    {biometricSupportInfo.supported
                      ? "ئامێرەکە پشتگیری دەکات"
                      : "ئامێرەکە پشتگیری ناکات (سوود لە پاسوورد وەربگرە)"}
                  </span>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => {
                  if (onUpdateUserSecurityConfig) {
                    onUpdateUserSecurityConfig({
                      ...userSecurityConfig,
                      enableFingerprint: !userSecurityConfig.enableFingerprint,
                    });
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  userSecurityConfig.enableFingerprint ? "bg-[#008767]" : "bg-stone-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    userSecurityConfig.enableFingerprint ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-stone-400">
              کاتێک بەرنامەکە دەکرێتەوە، یەکسەر بە پەنجەمۆری ئامێرەکەت دەکرێتەوە.
            </p>
          </div>

          {/* Face Unlock Toggle Card */}
          <div className="bg-stone-800/80 p-4 rounded-2xl border border-stone-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
                  <Smile className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-stone-100 font-display">
                    ناسێنەرەوەی دەم و چاو (Face Unlock)
                  </h4>
                  <span className="text-[10px] text-stone-400 font-medium block">
                    کۆنترۆڵکردنی کامێرا و Biometric
                  </span>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => {
                  if (onUpdateUserSecurityConfig) {
                    onUpdateUserSecurityConfig({
                      ...userSecurityConfig,
                      enableFaceUnlock: !userSecurityConfig.enableFaceUnlock,
                    });
                  }
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  userSecurityConfig.enableFaceUnlock ? "bg-[#008767]" : "bg-stone-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    userSecurityConfig.enableFaceUnlock ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-stone-400">
              ئەگەر سەرکەوتوو نەبوو، بەرنامەکە بە شێوەی ئۆتۆماتیکی پاسوورد داوا دەکات.
            </p>
          </div>

        </div>

        {/* 2. Password / PIN Setting Card */}
        <div className="bg-stone-800/80 p-4 rounded-2xl border border-stone-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black text-stone-100 font-display">
                  کۆد یان پاسووردی تایبەت
                </h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  userSecurityConfig.isPasswordSet
                    ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                    : "bg-amber-950 text-amber-300 border-amber-800"
                }`}>
                  {userSecurityConfig.isPasswordSet ? "پاسوورد دانراوە ✓" : "پاسوورد دانەنراوە ⚠️"}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                پاسووردەکان بە شێوەی ڕەمزکراوی بەهێز (SHA-256 Encrypted) هەڵدەگیرێن.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsChangePasswordOpen(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 shrink-0"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{userSecurityConfig.isPasswordSet ? "گۆڕینی پاسوورد" : "دانانی پاسوورد"}</span>
          </button>
        </div>

        {/* 3. Auto-Lock Timer Selection */}
        <div className="bg-stone-800/80 p-4 rounded-2xl border border-stone-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-black text-stone-100 font-display">
                ماوەی قوفڵبوونی ئۆتۆماتیکی (Auto-Lock Inactivity Timer)
              </h4>
            </div>
            <span className="text-[11px] font-mono font-extrabold text-emerald-300 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800">
              {userSecurityConfig.autoLockMinutes} خولەک
            </span>
          </div>

          <p className="text-[11px] text-stone-400">
            ئەگەر لەم ماوەیەدا هیچ کارێک لە بەرنامەکەدا نەکەیت، بەرنامەکە خۆکار قوفڵ دەبێت.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {[1, 5, 10, 15].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => {
                  if (onUpdateUserSecurityConfig) {
                    onUpdateUserSecurityConfig({
                      ...userSecurityConfig,
                      autoLockMinutes: mins,
                    });
                  }
                }}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold font-mono transition border ${
                  userSecurityConfig.autoLockMinutes === mins
                    ? "bg-[#008767] text-white border-emerald-400 shadow-md scale-102"
                    : "bg-stone-700/80 text-stone-300 border-stone-600 hover:bg-stone-700"
                }`}
              >
                {mins} خولەک
              </button>
            ))}
          </div>
        </div>

        {/* 4. Remember Me Toggle */}
        <div className="bg-stone-800/80 p-4 rounded-2xl border border-stone-700/80 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-black text-stone-100 font-display">
              شێوازی قوفڵبوون لە دووبارەکردنەوەدا (Remember Me)
            </h4>
            <p className="text-[11px] text-stone-400 mt-0.5">
              {userSecurityConfig.rememberMe
                ? "لەگەڵ بەجێهێشتنی بەکارنەکردندا قوفڵ بێت"
                : "هەر کاتێک بەرنامەکە دەکرێتەوە ڕاستەوخۆ پەنجەمۆر/پاسوورد داوا بکات"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onUpdateUserSecurityConfig) {
                onUpdateUserSecurityConfig({
                  ...userSecurityConfig,
                  rememberMe: !userSecurityConfig.rememberMe,
                });
              }
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              userSecurityConfig.rememberMe ? "bg-[#008767]" : "bg-stone-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                userSecurityConfig.rememberMe ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* 5. Security Logs & Diagnostics */}
        <div className="bg-stone-800/60 p-4 rounded-2xl border border-stone-700/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-stone-300 font-display flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              تۆماری چالاکی ئاسایش (Security Diagnostics)
            </h4>
            <span className="text-[10px] text-stone-400 font-mono">
              کۆی هەوڵە هەڵەکان: {securityLogs.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="bg-stone-900/80 p-2.5 rounded-xl border border-stone-700/60 text-stone-300 flex items-center justify-between">
              <span className="text-[11px] text-stone-400">دوایین چوونەژوورەوە:</span>
              <span className="font-mono font-bold text-emerald-400 text-[11px]">
                {(userSecurityConfig as any).lastLoginAt
                  ? formatDate((userSecurityConfig as any).lastLoginAt.slice(0, 10))
                  : "ئەمڕۆ"}
              </span>
            </div>

            <div className="bg-stone-900/80 p-2.5 rounded-xl border border-stone-700/60 text-stone-300 flex items-center justify-between">
              <span className="text-[11px] text-stone-400">دوایین پاشەکەوت (Backup):</span>
              <span className="font-mono font-bold text-emerald-400 text-[11px]">
                {(userSecurityConfig as any).lastBackupAt
                  ? formatDate((userSecurityConfig as any).lastBackupAt.slice(0, 10))
                  : "ئەمڕۆ"}
              </span>
            </div>
          </div>

          {/* Failed attempts alert log */}
          {securityLogs.length > 0 && (
            <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl space-y-1 text-xs">
              <div className="font-extrabold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>ئاگاداری: هەوڵی چوونەژوورەوەی ناڕاست هەبووە!</span>
              </div>
              <ul className="space-y-1 text-[11px] text-rose-200/90 pt-1">
                {securityLogs.slice(0, 3).map((log) => (
                  <li key={log.id} className="flex items-center justify-between">
                    <span>• {log.userName} ({log.reason})</span>
                    <span className="font-mono text-[10px] opacity-80">
                      {formatDate(log.timestamp.slice(0, 10))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        activeUser={activeUser}
        userConfig={userSecurityConfig}
        onSavePassword={(newHash) => {
          if (onUpdateUserSecurityConfig) {
            onUpdateUserSecurityConfig({
              ...userSecurityConfig,
              passwordHash: newHash,
              isPasswordSet: true,
            });
          }
        }}
      />

      {/* 1. FINANCIAL STATISTICS SECTION (Settings -> ئاماری دارایی) */}
      <FinancialStatsSection
        customers={customers}
        transactions={transactions}
        overdueThresholdDays={overdueThresholdDays}
        cloudUser={cloudUser}
        cloudStatus={cloudStatus}
      />

      {/* SEPARATED DEBT MANAGEMENT IN SETTINGS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-extrabold text-stone-900 font-display flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
            ڕێکخستن و کورتەی بەشەکانی قەرز (بە جیاواز)
          </h3>
          <span className="text-xs text-stone-400 font-medium">بەشی جیاکراوە</span>
        </div>

        {/* 1. GENERAL DEBT SETTINGS & OVERVIEW CARD */}
        <div className="bg-gradient-to-br from-red-950 via-rose-900 to-slate-900 text-white rounded-3xl p-5 shadow-lg border border-red-800/40 relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-rose-300">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold bg-red-500/20 text-rose-200 border border-rose-400/30 px-2 py-0.5 rounded-full">
                  🔴 بەشی یەکەم
                </span>
                <h4 className="text-base font-black font-display text-white mt-0.5">
                  ڕێکخستنی «قەرزی گشتی»
                </h4>
              </div>
            </div>

            {onSelectTab && (
              <button
                onClick={() => onSelectTab("general_debt")}
                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-extrabold flex items-center gap-1 transition"
              >
                <span>چوون بۆ بەشەکە</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-right">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <span className="text-[10px] text-rose-200 block font-medium">کۆی قەرزی گشتی</span>
              <span className="text-xs sm:text-sm font-black font-mono text-white block mt-0.5">
                {formatMoney(totalGeneralDebt)}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <span className="text-[10px] text-rose-200 block font-medium">کۆی قەرزداران</span>
              <span className="text-xs sm:text-sm font-black font-mono text-white block mt-0.5">
                {generalDebtors.length} کڕیار
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <span className="text-[10px] text-rose-200 block font-medium">قەرزە کۆنەکان</span>
              <span className="text-xs sm:text-sm font-black font-mono text-amber-300 block mt-0.5">
                {overdueGeneralDebtors.length} کڕیار
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-rose-100/80">
              تایبەت بە قەرزە هەمیشەییەکان و مامەڵە گەورەکانی کڕیاران
            </p>
            {onOpenExportReport && (
              <button
                onClick={() => onOpenExportReport("all", "general_debt")}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>ڕاپۆرتی قەرزی گشتی</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. DAILY DEBT SETTINGS & OVERVIEW CARD */}
        <div className="bg-gradient-to-br from-teal-950 via-teal-900 to-slate-950 text-white rounded-3xl p-5 shadow-lg border border-teal-700/40 relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-teal-300">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold bg-teal-500/20 text-teal-200 border border-teal-400/30 px-2 py-0.5 rounded-full">
                  🟢 بەشی دووەم
                </span>
                <h4 className="text-base font-black font-display text-white mt-0.5">
                  ڕێکخستنی «قەرزی کاتی»
                </h4>
              </div>
            </div>

            {onSelectTab && (
              <button
                onClick={() => onSelectTab("daily_debt")}
                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-extrabold flex items-center gap-1 transition"
              >
                <span>چوون بۆ بەشەکە</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-right">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <span className="text-[10px] text-teal-200 block font-medium">قەرزی نوێی ئەمڕۆ</span>
              <span className="text-xs sm:text-sm font-black font-mono text-teal-100 block mt-0.5">
                +{formatMoney(todayDailyDebtTotal)}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <span className="text-[10px] text-teal-200 block font-medium">وەسڵکراوی ئەمڕۆ</span>
              <span className="text-xs sm:text-sm font-black font-mono text-emerald-300 block mt-0.5">
                -{formatMoney(todayDailyPaymentTotal)}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <span className="text-[10px] text-teal-200 block font-medium">قەرزدارانی ڕۆژانە</span>
              <span className="text-xs sm:text-sm font-black font-mono text-white block mt-0.5">
                {dailyDebtorsList.length} کڕیار
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-teal-100/80">
              تایبەت بە تێبینی و قەرزە خێراکانی ڕۆژانەی دووکان
            </p>
            {onOpenExportReport && (
              <button
                onClick={() => onOpenExportReport("all", "daily_debt")}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>ڕاپۆرتی قەرزی کاتی</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Current Active User Info */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-sm"
            style={{ backgroundColor: activeUser.color || "#008767" }}
          >
            {activeUser.initial || activeUser.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-stone-900 text-base font-display">
                {activeUser.name}
              </h3>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                چالاکە
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">{activeUser.role}</p>
          </div>
        </div>
      </div>

      {/* GOOGLE CLOUD SECURITY CARD */}
      <div className="bg-gradient-to-br from-sky-900 via-teal-900 to-slate-900 text-white rounded-3xl p-5 shadow-lg border border-teal-700/50 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-sky-300">
              <CloudCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm font-display text-white">
                پاراستنی هەمیشەیی لە Google Cloud ☁️
              </h3>
              <p className="text-[11px] text-teal-200/80">
                هاوکاتکردنی خۆکاری سەرجەم قەرزەکان و کڕیاران
              </p>
            </div>
          </div>
        </div>

        {cloudUser ? (
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-teal-200">هەژماری پەیڕەوکراو:</span>
              <span className="font-bold font-mono text-white">{cloudUser.email}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-teal-200">دۆخی پاراستن:</span>
              <span className="text-emerald-300 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                تەواوی داتاکان لە Cloud پارێزراون
              </span>
            </div>
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={onOpenBackup}
                className="flex-1 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition"
              >
                بەڕێوەبردنی هاوکاتکردن
              </button>
              <button
                onClick={onLogoutGoogle}
                className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>دەرچوون</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-teal-100/90 leading-relaxed">
              تەنها بە چوونەژوورەوەت بە هەژماری Gmail، هەموو داتاکانت لەسەر سەرڤەری Firebase دەپارێزرێن. ئەگەر ئایپاد یان ئامێرەکەت بشکێت، بدزرێت یان بیگۆڕیت، تەنها بە هەمان Gmail بچۆ ژوورەوە هەمووی وەک خۆی دەگەڕێتەوە!
            </p>
            <button
              onClick={onLoginGoogle}
              className="w-full py-3 bg-white text-slate-900 hover:bg-teal-50 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md active:scale-95"
            >
              <LogIn className="w-4 h-4 text-blue-600" />
              <span>چوونەژوورەوە بە Gmail (Google Sign-In)</span>
            </button>
          </div>
        )}
      </div>

      {/* CUSTOMER ID CONFIGURATION SECTION */}
      <div className="bg-white rounded-3xl p-5 border border-indigo-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-stone-900 text-sm font-display">
                  سیستەمی Customer ID (ژمارەی ناوازەی قەرزداران)
                </h3>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  customerIdConfig.enabled
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-stone-100 text-stone-600 border-stone-300"
                }`}>
                  {customerIdConfig.enabled ? "چالاککراوە ✓" : "ناچالاککراوە ⏸️"}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                تایبەتکردنی ژمارەی ناوازەی قەرزداران بۆ بەشەکانی: قەرزی گشتی، قەرزی کاتی، و داواکاری ڕۆژانە
              </p>
            </div>
          </div>

          {/* Toggle Button */}
          <button
            type="button"
            onClick={() => {
              if (onChangeCustomerIdConfig) {
                onChangeCustomerIdConfig({
                  ...customerIdConfig,
                  enabled: !customerIdConfig.enabled,
                });
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              customerIdConfig.enabled
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            {customerIdConfig.enabled ? "ناچالاککردن" : "چالاککردن"}
          </button>
        </div>

        {/* Inputs and Live Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          {/* Prefix Input */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              پێشگری ژمارە (Prefix)
            </label>
            <input
              type="text"
              value={customerIdConfig.prefix}
              onChange={(e) => {
                if (onChangeCustomerIdConfig) {
                  onChangeCustomerIdConfig({
                    ...customerIdConfig,
                    prefix: e.target.value,
                  });
                }
              }}
              placeholder="نموونە: C-، ID-، K-"
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold font-mono text-center dir-ltr focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Starting Number Input */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              ژمارەی داهاتوو (Next Number)
            </label>
            <input
              type="number"
              min="1"
              value={customerIdConfig.startingNumber}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                if (onChangeCustomerIdConfig) {
                  onChangeCustomerIdConfig({
                    ...customerIdConfig,
                    startingNumber: Math.max(1, val),
                  });
                }
              }}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold font-mono text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Live ID Preview */}
          <div className="bg-indigo-50/70 border border-indigo-200 p-2.5 rounded-2xl flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-indigo-900 font-bold block">نموونەی Customer ID داهاتوو:</span>
            <span className="text-sm font-black font-mono text-indigo-950 bg-indigo-200/80 px-3 py-1 rounded-lg mt-1 border border-indigo-300 dir-ltr shadow-2xs">
              #{formatCustomerId(customerIdConfig.startingNumber, customerIdConfig.prefix)}
            </span>
          </div>
        </div>

        {/* Feature Rules List */}
        <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
          <p className="font-bold text-stone-800">تێبینییە سەرەکییەکانی Customer ID:</p>
          <ul className="list-disc list-inside space-y-0.5 text-[10.5px]">
            <li>ژمارەکە هەمیشەیی لەگەڵ هەمان قەرزدار دەمێنێتەوە لە هەرسێ بەشەکەدا.</li>
            <li>ئەگەر کڕیارێک بسڕدرێتەوە، ژمارەکەی پارێزراو دەبێت و بۆ کەسێکی تر بەکارنایەتەوە.</li>
            <li>لە کاتی تۆمارکردن یان دەستکاریکردندا، دەتوانیت ژمارەی دەستی بنووسیت و سیستەمەکە ڕێگری لە ژمارەی دووبارە دەکات.</li>
          </ul>
        </div>
      </div>

      {/* Overdue Debt Threshold Setting */}
      <div className="bg-white rounded-3xl p-5 border border-amber-200/90 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 border border-amber-300">
            <Bell className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-sm font-display flex items-center gap-2">
              ماوەی دیاریکردنی «قەرزی کۆن»
              <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full font-mono">
                {overdueThresholdDays} ڕۆژ
              </span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              هەر قەرزێک لەم ماوەیە زیاتر بخایەنێت و نەدرێتەوە، وەک قەرزی کۆن نیشان دەدرێت و ئاگادارت دەکاتەوە.
            </p>
          </div>
        </div>

        {/* Presets and custom input */}
        <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {[15, 30, 45, 60, 90].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onChangeOverdueThresholdDays && onChangeOverdueThresholdDays(days)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold font-mono transition ${
                  overdueThresholdDays === days
                    ? "bg-amber-600 text-white shadow-xs scale-105"
                    : "bg-stone-100 text-stone-700 hover:bg-amber-100 hover:text-amber-900"
                }`}
              >
                {days} ڕۆژ
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">یاخود:</span>
            <input
              type="number"
              min="1"
              max="365"
              value={overdueThresholdDays}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val > 0 && onChangeOverdueThresholdDays) {
                  onChangeOverdueThresholdDays(val);
                }
              }}
              className="w-20 px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-extrabold text-center font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <span className="text-xs text-stone-500 font-bold">ڕۆژ</span>
          </div>
        </div>
      </div>

      {/* Recycle Bin Section */}
      {onOpenRecycleBin && (
        <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm font-display flex items-center gap-2">
                تەنەکەی زبڵ (سڕاوەکان)
                {trashCount > 0 && (
                  <span className="text-[10px] bg-red-100 text-red-800 font-mono font-bold px-2 py-0.5 rounded-full">
                    {trashCount} بڕگە
                  </span>
                )}
              </h3>
              <p className="text-xs text-stone-400">
                بینین و گەڕاندنەوەی ئەو قەرزدار و مامەڵانەی سڕراونەتەوە
              </p>
            </div>
          </div>

          <button
            onClick={onOpenRecycleBin}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition"
          >
            کراوەیە ↗
          </button>
        </div>
      )}

      {/* Backup & Data Section */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-stone-900 font-display flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#008767]" />
          پاشەکەوتکردنی داتا و پشتیوانی (Backup)
        </h3>

        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-stone-900">پاشەکەوت و هاوردەکردن</h4>
            <p className="text-[11px] text-stone-500 mt-0.5">
              دابەزاندن یان بارکردنی فایلی JSON بۆ پاراستنی حیساباتەکەت.
            </p>
          </div>

          <button
            onClick={onOpenBackup}
            className="px-4 py-2.5 bg-[#008767] hover:bg-[#007256] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>بەڕێوەبردنی پاشەکەوت</span>
          </button>
        </div>
      </div>

      {/* Paper Style Mode Toggle */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-sm font-display">
              شێوازی دفتەری کاغەزی
            </h3>
            <p className="text-xs text-stone-400">
              دیزاینی خەتی کاغەز بۆ هەستکردن بە دفتەری حیسابی نەریتی
            </p>
          </div>
        </div>

        <button
          onClick={onTogglePaperMode}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            paperMode
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          {paperMode ? "چالاککراوە ✓" : "ناچالاک"}
        </button>
      </div>

      {/* App Version Branding */}
      <div className="p-6 bg-stone-900 text-white rounded-3xl text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#008767] text-white flex items-center justify-center mx-auto mb-2">
          <Store className="w-6 h-6" />
        </div>
        <h4 className="font-extrabold text-amber-200 font-display">
          دفتەری حسابی دوکان
        </h4>
        <p className="text-xs text-stone-400 mt-1">
          وەشانی تایبەت بە کوردستان - ٢٠٢٦
        </p>
      </div>

    </div>
  );
};



import React, { useRef, useState } from "react";
import { X, Download, Upload, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Cloud, CloudCheck, LogIn, LogOut, Check } from "lucide-react";
import { StoreData } from "../types";
import { INITIAL_CUSTOMERS, INITIAL_TRANSACTIONS } from "../data/initialData";

interface BackupModalProps {
  isOpen: boolean;
  data: StoreData;
  cloudUser?: any;
  cloudStatus?: "synced" | "syncing" | "offline" | "logged_out" | "error";
  onClose: () => void;
  onRestoreData: (newData: StoreData) => void;
  onLoginGoogle?: () => void;
  onLogoutGoogle?: () => void;
  onForceCloudSync?: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  data,
  cloudUser,
  cloudStatus = "logged_out",
  onClose,
  onRestoreData,
  onLoginGoogle,
  onLogoutGoogle,
  onForceCloudSync,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  // Export JSON file
  const handleExport = () => {
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `dukan-ledger-backup-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg({ type: "success", text: "فایلی پاشەکەوت بە سەرکەوتوویی دابەزێنرا!" });
    } catch (e) {
      setMsg({ type: "error", text: "کێشەیەک ڕوویدا لە دابەزاندنی فایل" });
    }
  };

  // Import JSON file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.customers) && Array.isArray(parsed.transactions)) {
          // Auto backup existing data before restoring
          try {
            localStorage.setItem("dukan_auto_backup_before_restore", JSON.stringify(data));
          } catch (e) {
            console.error("Auto backup before restore error", e);
          }
          onRestoreData(parsed);
          setMsg({ type: "success", text: "داتاکان بە سەرکەوتوویی هاوردەکران و نوێکرانەوە! (پاشەکەوتی خۆکار دروستکرا)" });
        } else {
          setMsg({ type: "error", text: "فایلی هەڵبژێردراو پێکهاتەی دفتەری حسابی نییە" });
        }
      } catch (err) {
        setMsg({ type: "error", text: "فایلەکە نەتوانرا بخوێندرێتەوە (JSON نەگونجاو)" });
      }
    };
    reader.readAsText(file);
  };

  // Reset to seed data
  const handleResetSample = () => {
    if (confirm("ئایا دڵنیایت لە گەڕاندنەوەی زانیارییە سەرەتاییەکان؟")) {
      try {
        localStorage.setItem("dukan_auto_backup_before_restore", JSON.stringify(data));
      } catch (e) {
        console.error("Auto backup error", e);
      }
      onRestoreData({
        customers: INITIAL_CUSTOMERS,
        transactions: INITIAL_TRANSACTIONS,
        lastUserId: "u1",
      });
      setMsg({ type: "success", text: "زانیارییە نموونەییەکان گەڕێنرانەوە" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-lg overflow-hidden my-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-600/30 border border-teal-500/30 flex items-center justify-center text-teal-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base font-display text-white">
                پاراستن و هاوکاتکردنی داتا لە Cloud ☁️
              </h3>
              <p className="text-[11px] text-teal-200/80">
                سیستەمی پاراستنی هەورەکی خۆکار + بکئەپی ناوخۆیی
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white bg-white/10 rounded-full transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          {msg && (
            <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              msg.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              {msg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{msg.text}</span>
            </div>
          )}

          {/* PRIMARY CLOUD SYNC SECTION */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 via-teal-50 to-emerald-50 border border-sky-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudCheck className="w-5 h-5 text-sky-700" />
                <h4 className="text-xs font-bold text-slate-900">
                  هاوکاتکردنی خۆکار لە Cloud (Firebase)
                </h4>
              </div>
              {cloudUser ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  چووەتە ژوورەوە
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  لۆگین نەکراوە
                </span>
              )}
            </div>

            {cloudUser ? (
              <div className="space-y-3 pt-1">
                <div className="bg-white/80 p-3 rounded-xl border border-sky-100 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 text-[11px]">هەژماری Google:</span>
                    <span className="font-bold font-mono text-slate-900">{cloudUser.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 text-[11px]">باری هاوکاتکردن:</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      خۆکار لەسەر سەرڤەر پاشەکەوت دەبێت
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onForceCloudSync}
                    className="flex-1 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>هاوکاتکردنی خێرا ئێستا</span>
                  </button>

                  <button
                    type="button"
                    onClick={onLogoutGoogle}
                    className="px-3 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                    title="چوونەدەرەوە لە Google"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>چوونەدەرەوە</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                <p className="text-xs text-stone-600 leading-relaxed">
                  تەنها بە کلیکێک لەسەر <strong>چوونەژوورەوە بە Gmail</strong>، سەرجەم قەرزەکان، کڕیاران و وەسڵەکان بە هەمیشەیی و خۆکار لە Cloud دەیپارێزێت. ئەگەر ئایپادەکەت بشکێت یان بیگۆڕیت، بە هەمان Gmail بچۆ ژوورەوە هەمووی وەک خۆی دەگەڕێتەوە.
                </p>
                <button
                  type="button"
                  onClick={onLoginGoogle}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 active:scale-95"
                >
                  <LogIn className="w-4 h-4" />
                  <span>چوونەژوورەوە بە Gmail (Google Sign-In)</span>
                </button>
              </div>
            )}
          </div>

          {/* Download Backup */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl">
            <h4 className="text-xs font-bold text-stone-900 mb-1 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-700" />
              دابەزاندنی فایلی پاشەکەوت (Export JSON)
            </h4>
            <p className="text-[11px] text-stone-500 mb-3">
              فایلێک دادەبەزێنرێت بە شێوازی JSON لەسەر ئامێرەکەت بۆ ئەوەی وەک کۆپییەک لای خۆت هەڵشگریت.
            </p>
            <button
              onClick={handleExport}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>داگرتنی کۆپی JSON</span>
            </button>
          </div>

          {/* Restore Backup */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl">
            <h4 className="text-xs font-bold text-stone-900 mb-1 flex items-center gap-2">
              <Upload className="w-4 h-4 text-teal-700" />
              هاوردەکردنی فایلی JSON (Restore)
            </h4>
            <p className="text-[11px] text-stone-500 mb-3">
              ئەگەر فایلی دفتەرەکەت لەسەر ئامێرێکی تر هەیە، لێرەوە هەڵیبژێرە بۆ بەگەڕخستنەوە.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>هەڵبژاردنی فایلی JSON</span>
            </button>
          </div>

          {/* Reset Seed Data */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
            <button
              onClick={handleResetSample}
              className="text-xs text-stone-400 hover:text-stone-700 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              گەڕاندنەوەی زانیاریی سەرەتایی
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition"
            >
              داخستن
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};


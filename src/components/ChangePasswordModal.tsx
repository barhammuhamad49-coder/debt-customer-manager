import React, { useState } from "react";
import { X, KeyRound, ShieldCheck, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { UserProfile } from "../types";
import { UserSecurityConfig, hashPassword } from "../utils/security";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: UserProfile;
  userConfig: UserSecurityConfig;
  onSavePassword: (newPasswordHash: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  activeUser,
  userConfig,
  onSavePassword,
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // If current password exists, check it
    if (userConfig.isPasswordSet && userConfig.passwordHash) {
      const hashedCurrent = await hashPassword(currentPassword);
      if (hashedCurrent !== userConfig.passwordHash) {
        setErrorMsg("پاسووردی ئێستا هەڵەیە!");
        return;
      }
    }

    if (!newPassword.trim()) {
      setErrorMsg("تکایە پاسووردی نوێ بنووسە.");
      return;
    }

    if (newPassword.length < 3) {
      setErrorMsg("پاسوورد پێویستە لانی کەم ٣ پیت یان ژمارە بێت.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("پاسووردی نوێ لەگەڵ دووبارەکردنەوەکەدا یەکناگرێتەوە.");
      return;
    }

    // Hash the new password securely
    const hashedNew = await hashPassword(newPassword);
    onSavePassword(hashedNew);

    setSuccessMsg("پاسووردەکە بە سەرکەوتوویی پاشەکەوت کراو نوێکرایەوە.");
    setTimeout(() => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrorMsg(null);
      setSuccessMsg(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 dir-rtl">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl shadow-xl overflow-hidden space-y-4 p-5 sm:p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#008767]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900 font-display">
                گۆڕین یان دانانی پاسوورد
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                بەکارهێنەر: {activeUser.name} ({activeUser.role})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-bold animate-in fade-in">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-800 text-xs font-bold animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Current Password field (if previously set) */}
          {userConfig.isPasswordSet && (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                پاسووردی ئێستا:
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="پاسووردی کۆن بنووسە..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#008767]/20 pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              پاسووردی نوێ:
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="پاسووردی نوێ بڕیار بدە..."
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#008767]/20 pl-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              دووبارەکردنەوەی پاسووردی نوێ:
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="پاسووردەکەی نوێ دووبارە بکەرەوە..."
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#008767]/20"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition"
            >
              پووچەڵکردنەوە
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#008767] hover:bg-[#007055] text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>پاشەکەوتکردنی پاسوورد</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

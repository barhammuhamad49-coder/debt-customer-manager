import React, { useState, useEffect } from "react";
import {
  Lock,
  KeyRound,
  Fingerprint,
  Smile,
  ShieldAlert,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  UserCheck,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import { UserProfile } from "../types";
import {
  UserSecurityConfig,
  authenticateWithBiometrics,
  checkBiometricsSupport,
  hashPassword,
  addFailedLoginLog,
} from "../utils/security";

interface SecurityLockModalProps {
  isOpen: boolean;
  activeUser: UserProfile;
  userConfig: UserSecurityConfig;
  allUsers: UserProfile[];
  onUnlock: () => void;
  onSwitchUser: (user: UserProfile) => void;
}

export const SecurityLockModal: React.FC<SecurityLockModalProps> = ({
  isOpen,
  activeUser,
  userConfig,
  allUsers,
  onUnlock,
  onSwitchUser,
}) => {
  const [inputPassword, setInputPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0); // in seconds
  const [isAuthenticatingBiometric, setIsAuthenticatingBiometric] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);

  // Check biometric support on mount
  useEffect(() => {
    checkBiometricsSupport().then((res) => {
      setBiometricSupported(res.supported);
    });
  }, []);

  // Auto trigger biometrics if enabled for this user when modal opens
  useEffect(() => {
    if (isOpen && (userConfig.enableFingerprint || userConfig.enableFaceUnlock) && biometricSupported && lockoutTimeLeft === 0) {
      handleBiometricAuth();
    }
  }, [isOpen, activeUser.id, userConfig.enableFingerprint, userConfig.enableFaceUnlock, biometricSupported]);

  // Lockout timer interval
  useEffect(() => {
    if (lockoutTimeLeft > 0) {
      const timer = setInterval(() => {
        setLockoutTimeLeft((prev) => {
          if (prev <= 1) {
            setErrorMessage(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutTimeLeft]);

  if (!isOpen) return null;

  const handleBiometricAuth = async () => {
    if (lockoutTimeLeft > 0) return;
    setIsAuthenticatingBiometric(true);
    setErrorMessage(null);

    try {
      const res = await authenticateWithBiometrics(activeUser.name);
      setIsAuthenticatingBiometric(false);

      if (res.success) {
        setFailedAttempts(0);
        setInputPassword("");
        setErrorMessage(null);
        onUnlock();
      } else {
        // Fallback to password mode
        if (res.message) {
          setErrorMessage(res.message);
        }
      }
    } catch (e) {
      setIsAuthenticatingBiometric(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimeLeft > 0) return;

    if (!inputPassword.trim()) {
      setErrorMessage("تکایە پاسوورد داخڵ بکە.");
      return;
    }

    const hashedInput = await hashPassword(inputPassword);

    // If password matches or user has not set a password yet
    if (!userConfig.isPasswordSet || hashedInput === userConfig.passwordHash) {
      setFailedAttempts(0);
      setInputPassword("");
      setErrorMessage(null);
      onUnlock();
    } else {
      const newFailed = failedAttempts + 1;
      setFailedAttempts(newFailed);

      // Log failed attempt
      addFailedLoginLog(activeUser.id, activeUser.name, "تۆمارکردنی پاسووردی هەڵە");

      if (newFailed >= 3) {
        setLockoutTimeLeft(30); // 30 seconds lockout
        setFailedAttempts(0);
        setErrorMessage("٣ جار پاسووردی هەڵە داخڵکرا! بەرنامەکە بۆ ٣٠ چرکە قوفڵکرا.");
      } else {
        setErrorMessage(`پاسوورد هەڵەیە! (${3 - newFailed} هەوڵی تر ماوە)`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200 dir-rtl">
      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden text-white space-y-6 p-6 sm:p-8">
        
        {/* App Logo & Lock Status */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#008767] to-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-[#008767]/20 relative">
            <Lock className="w-8 h-8 text-white" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-stone-900 border-2 border-stone-800 flex items-center justify-center text-emerald-400">
              <Shield className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 px-3 py-1 rounded-full">
              بەرنامەکە قوفڵ دراوە
            </span>
            <h2 className="text-xl font-black font-display mt-2 text-stone-100">
              دفتر حسابی دکان (پاراستنی داتا)
            </h2>
            <p className="text-xs text-stone-400 font-medium mt-1">
              تکایە خۆت بناسێنە بۆ کردنەوەی بەرنامەکە
            </p>
          </div>
        </div>

        {/* User Card */}
        <div className="bg-stone-800/70 p-3.5 rounded-2xl border border-stone-700/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl ${activeUser.color} flex items-center justify-center text-white font-black text-lg shadow-md font-display`}>
              {activeUser.initial}
            </div>
            <div className="text-right">
              <h3 className="font-bold text-stone-100 text-sm font-display">
                {activeUser.name}
              </h3>
              <span className="text-[11px] text-stone-400 font-medium block mt-0.5">
                پلە: {activeUser.role}
              </span>
            </div>
          </div>

          {/* Switch User dropdown button */}
          <div className="flex items-center gap-1">
            {allUsers.length > 1 && (
              <div className="relative group">
                <button
                  type="button"
                  className="px-2.5 py-1.5 bg-stone-700/80 hover:bg-stone-700 text-stone-300 text-xs font-bold rounded-xl transition flex items-center gap-1"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>گۆڕین</span>
                </button>

                {/* Dropdown menu */}
                <div className="absolute left-0 mt-1 w-44 bg-stone-800 border border-stone-700 rounded-2xl shadow-xl hidden group-hover:block z-20 overflow-hidden py-1">
                  <div className="px-3 py-1.5 text-[10px] text-stone-400 font-bold border-b border-stone-700/60">
                    هەڵبژاردنی بەکارهێنەر:
                  </div>
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => onSwitchUser(u)}
                      className={`w-full text-right px-3 py-2 text-xs font-bold transition flex items-center justify-between ${
                        u.id === activeUser.id
                          ? "bg-emerald-950/80 text-emerald-400"
                          : "hover:bg-stone-700/60 text-stone-200"
                      }`}
                    >
                      <span>{u.name}</span>
                      <span className="text-[10px] text-stone-400">{u.role}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lockout Warning Banner */}
        {lockoutTimeLeft > 0 ? (
          <div className="p-4 bg-rose-950/80 border border-rose-800 rounded-2xl text-center space-y-2 animate-pulse">
            <ShieldAlert className="w-8 h-8 text-rose-400 mx-auto" />
            <div className="text-xs font-black text-rose-200">
              بەرنامەکە بۆ {lockoutTimeLeft} چرکەی تر قوفڵ دەبێت
            </div>
            <p className="text-[11px] text-rose-300/80">
              بەهۆی زۆری هەوڵە هەڵەکان، تکایە کەمێکی تر چاوەڕوان ببه...
            </p>
          </div>
        ) : (
          <>
            {/* Biometrics Action (Fingerprint & Face) */}
            {(userConfig.enableFingerprint || userConfig.enableFaceUnlock) && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleBiometricAuth}
                  disabled={isAuthenticatingBiometric}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-[#008767] hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2 border border-emerald-500/40"
                >
                  {userConfig.enableFaceUnlock ? (
                    <Smile className="w-5 h-5 text-emerald-100" />
                  ) : (
                    <Fingerprint className="w-5 h-5 text-emerald-100" />
                  )}
                  <span>
                    {isAuthenticatingBiometric
                      ? "تکایە پەنجەمۆر یان دەم و چاو دابنێ..."
                      : "کردنەوە بە پەنجەمۆر / Face Unlock"}
                  </span>
                </button>
              </div>
            )}

            {/* Password Form */}
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5 flex items-center justify-between">
                  <span>پاسوورد یان کۆدی پاراستن:</span>
                  {!userConfig.isPasswordSet && (
                    <span className="text-[10px] text-amber-400 font-bold">
                      (کۆد دانەنراوە - هەر شتێک بگریت دەکرێتەوە)
                    </span>
                  )}
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={inputPassword}
                    onChange={(e) => {
                      setInputPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="پاسووردی خۆت بنووسە..."
                    autoFocus
                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-2xl text-stone-100 text-sm font-mono placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#008767] pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 transition p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-center gap-2 text-rose-300 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 bg-stone-800 hover:bg-stone-700 text-stone-100 font-extrabold text-xs sm:text-sm rounded-2xl transition border border-stone-700 flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>کردنەوەی بەرنامە</span>
              </button>
            </form>
          </>
        )}

        {/* Footnote info */}
        <div className="text-center pt-2 border-t border-stone-800">
          <p className="text-[11px] text-stone-500 font-medium">
            🔒 هەموو داتاکانت بە شێوەی تۆکمە پارێزراون لە Firebase Cloud
          </p>
        </div>

      </div>
    </div>
  );
};

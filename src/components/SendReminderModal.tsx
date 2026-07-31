import React, { useState, useEffect } from "react";
import { X, Send, Copy, Check, MessageSquare, PhoneCall, Share2, AlertCircle } from "lucide-react";
import { Customer } from "../types";
import { formatMoney } from "../utils/storage";

interface SendReminderModalProps {
  isOpen: boolean;
  customer: Customer | null;
  balance: number;
  overdueDays: number;
  onClose: () => void;
}

export const SendReminderModal: React.FC<SendReminderModalProps> = ({
  isOpen,
  customer,
  balance,
  overdueDays,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [customText, setCustomText] = useState("");

  useEffect(() => {
    if (customer) {
      const defaultMsg = `سڵاو ${customer.name}، بیرخستنەوەیەکی دوستانە. بەپێی تۆمارەکان، بڕی (${formatMoney(balance)}) لەسەرت ماوە و ماوەی (${overdueDays > 0 ? overdueDays : 30}) ڕۆژە قەرزەکە دواکەوتووە. تکایە لە زووترین کاتدا قەرزەکە یەکلا بکەوە. سوپاس بۆ هاوکاری و متمانەت.`;
      setCustomText(defaultMsg);
    }
  }, [customer, balance, overdueDays]);

  if (!isOpen || !customer) return null;

  const cleanPhone = customer.phone ? customer.phone.replace(/[^0-9+]/g, "") : "";

  // Share Handlers
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(customText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(customText);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, "_blank");
  };

  const handleTelegram = () => {
    const encoded = encodeURIComponent(customText);
    const url = `https://t.me/share/url?url=&text=${encoded}`;
    window.open(url, "_blank");
  };

  const handleViber = () => {
    const encoded = encodeURIComponent(customText);
    const url = `viber://forward?text=${encoded}`;
    window.open(url, "_blank");
  };

  const handleSMS = () => {
    const encoded = encodeURIComponent(customText);
    const url = cleanPhone ? `sms:${cleanPhone}?body=${encoded}` : `sms:?body=${encoded}`;
    window.open(url, "_blank");
  };

  const handleSystemShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "بیرخستنەوەی قەرز",
          text: customText,
        });
      } catch (err) {
        console.log("Share cancelled or failed", err);
      }
    } else {
      handleCopyText();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200/90 space-y-0">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-900 via-amber-800 to-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base font-display text-white">
                ناردنی بیرخستنەوەی قەرز
              </h3>
              <p className="text-xs text-amber-200/90 font-medium">
                بیرخستنەوە بۆ: {customer.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Summary Bar */}
        <div className="p-4 bg-amber-50/80 border-b border-amber-200/70 flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-amber-800 font-medium block">کۆی قەرز:</span>
            <span className="font-extrabold font-mono text-amber-950 text-base">
              {formatMoney(balance)}
            </span>
          </div>

          <div className="text-left">
            <span className="text-amber-800 font-medium block">دواکەوتن:</span>
            <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-full font-mono">
              <AlertCircle className="w-3 h-3 text-amber-800" />
              {overdueDays > 0 ? `${overdueDays} ڕۆژ` : "زیاتر لە ٣٠ ڕۆژ"}
            </span>
          </div>
        </div>

        {/* Message Editor / Preview */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 font-display flex items-center justify-between">
              <span>دەقی نامەی بیرخستنەوە:</span>
              <span className="text-[10px] text-stone-400 font-normal">دەتوانیت دەقەکە دەستکاری بکەیت</span>
            </label>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={4}
              className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none leading-relaxed resize-none font-sans"
            />
          </div>

          {/* Share Platform Buttons */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-stone-800 font-display">
              بەرنامەی ناردن هەڵبژێرە:
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {/* WhatsApp */}
              <button
                onClick={handleWhatsApp}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs active:scale-95"
              >
                <span className="text-base">💬</span>
                <span>WhatsApp</span>
              </button>

              {/* Telegram */}
              <button
                onClick={handleTelegram}
                className="py-2.5 px-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs active:scale-95"
              >
                <span className="text-base">✈️</span>
                <span>Telegram</span>
              </button>

              {/* Viber */}
              <button
                onClick={handleViber}
                className="py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs active:scale-95"
              >
                <span className="text-base">🟣</span>
                <span>Viber</span>
              </button>

              {/* SMS */}
              <button
                onClick={handleSMS}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                <span>SMS</span>
              </button>

              {/* Copy Text */}
              <button
                onClick={handleCopyText}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs active:scale-95 ${
                  copied
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-stone-800 hover:bg-stone-900 text-white"
                }`}
              >
                {copied ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "کۆپیکرا ✓" : "کۆپیکردنی دەق"}</span>
              </button>

              {/* Native System Share Sheet */}
              <button
                onClick={handleSystemShare}
                className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs active:scale-95 col-span-2 sm:col-span-1"
              >
                <Share2 className="w-4 h-4" />
                <span>بەرنامەکانی تر</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold transition"
          >
            داخستن
          </button>
        </div>

      </div>
    </div>
  );
};

import React from "react";
import { X, Printer, Share2, Store, CheckCircle, Copy, Check } from "lucide-react";
import { Customer, Transaction } from "../types";
import { calculateCustomerBalance, formatDate, formatMoney } from "../utils/storage";

interface ReceiptModalProps {
  transaction: Transaction | null;
  customer: Customer | null;
  allTransactions: Transaction[];
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  customer,
  allTransactions,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!transaction || !customer) return null;

  const currentBalance = calculateCustomerBalance(customer.id, allTransactions);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const text = `🧾 *وەسڵی حسابی دوکان*\nکڕیار: ${customer.name}\nمامەڵە: ${transaction.type === "debt" ? "کڕین بە قەرز" : "دانەوەی پارە"}\nبڕی پارە: ${formatMoney(transaction.amount)}\nبەروار: ${formatDate(transaction.date)}\nتێبینی: ${transaction.note || "بێ تێبینی"}\n------------------\nکۆی باقی قەرز: ${formatMoney(currentBalance)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-sm overflow-hidden my-auto print:shadow-none print:border-0 print:w-full">
        
        {/* Top Header Controls (Hidden on Print) */}
        <div className="bg-stone-900 p-4 text-white flex items-center justify-between no-print">
          <span className="text-xs font-bold font-display text-amber-200">
            وەسڵی ووردەکاری مامەڵە
          </span>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white bg-stone-800 rounded-full transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Voucher Body */}
        <div className="p-6 bg-amber-50/20 paper-lines">
          
          {/* Shop Branding Header */}
          <div className="text-center pb-4 border-b border-dashed border-stone-300">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center mx-auto mb-2">
              <Store className="w-5 h-5" />
            </div>
            <h2 className="font-extrabold text-lg text-stone-900 font-display">
              دفتەری حسابی دوکان
            </h2>
            <div className="mt-2 mb-1 p-2 bg-stone-100/80 rounded-xl inline-block text-right text-[11px] text-stone-800 border border-stone-200">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-stone-500 font-medium">خاوەنی دووکان: </span>
                  <span className="font-extrabold text-stone-900">مەریوان</span>
                  <span className="dir-ltr inline-block mr-1 font-bold text-emerald-800">📞 07501335304</span>
                </div>
                <div className="border-r border-stone-300 pr-3">
                  <span className="text-stone-500 font-medium">بەکارهێنەر: </span>
                  <span className="font-extrabold text-stone-900">بەرهەم</span>
                  <span className="dir-ltr inline-block mr-1 font-bold text-emerald-800">📞 07508415775</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-stone-500">
              کوردستان - کۆدی وەسڵ: #{transaction.id.slice(-6)}
            </p>
          </div>

          {/* Receipt Info */}
          <div className="py-4 space-y-2.5 text-xs text-stone-700">
            
            <div className="flex justify-between items-center pb-1 border-b border-stone-100">
              <span className="text-stone-500">ناوی کڕیار:</span>
              <span className="font-bold text-stone-900 text-sm">{customer.name}</span>
            </div>

            {customer.phone && (
              <div className="flex justify-between items-center pb-1 border-b border-stone-100">
                <span className="text-stone-500">ژمارەی مۆبایل:</span>
                <span className="font-mono dir-ltr text-stone-800">{customer.phone}</span>
              </div>
            )}

            <div className="flex justify-between items-center pb-1 border-b border-stone-100">
              <span className="text-stone-500">جۆری مامەڵە:</span>
              <span className={`font-bold px-2 py-0.5 rounded-md ${
                transaction.type === "debt"
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-800"
              }`}>
                {transaction.type === "debt" ? "کڕین بە قەرز" : "دانەوەی پارە"}
              </span>
            </div>

            <div className="flex justify-between items-center pb-1 border-b border-stone-100">
              <span className="text-stone-500">بڕی پارە:</span>
              <span className="font-black text-base text-stone-900 tabular">
                {formatMoney(transaction.amount)}
              </span>
            </div>

            {transaction.note && (
              <div className="flex justify-between items-center pb-1 border-b border-stone-100">
                <span className="text-stone-500">تێبینی / کاڵا:</span>
                <span className="font-medium text-stone-800">{transaction.note}</span>
              </div>
            )}

            <div className="flex justify-between items-center pb-1 border-b border-stone-100">
              <span className="text-stone-500">بەروار:</span>
              <span className="font-mono text-stone-800">{formatDate(transaction.date)}</span>
            </div>

            <div className="flex justify-between items-center pb-1 border-b border-stone-100">
              <span className="text-stone-500">تۆمارکار:</span>
              <span className="font-bold text-stone-800">{transaction.createdByName}</span>
            </div>

          </div>

          {/* Current Remaining Total Debt Footer */}
          <div className="mt-2 p-3 bg-stone-900 text-white rounded-2xl text-center">
            <div className="text-[10px] text-stone-400">کۆی گشتی باقی قەرزی ئێستا:</div>
            <div className="text-lg font-black text-amber-300 tabular">
              {formatMoney(currentBalance)}
            </div>
          </div>

          <div className="mt-4 text-center text-[10px] text-stone-400">
            سوپاس بۆ هاوکاری و مامەڵەکردنتان 🙏
          </div>

        </div>

        {/* Buttons (Hidden on Print) */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2 no-print">
          <button
            onClick={handleCopyText}
            className="flex-1 py-2 px-3 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "کۆپی کرا!" : "کۆپیکردنی دەق"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>چاپکردنی وەسڵ</span>
          </button>
        </div>

      </div>

    </div>
  );
};

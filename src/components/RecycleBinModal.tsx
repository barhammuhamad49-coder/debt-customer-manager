import React, { useState } from "react";
import { X, Trash2, RotateCcw, Search, AlertTriangle, UserX, FileX, Check, AlertCircle } from "lucide-react";
import { DeletedCustomerRecord, DeletedTransactionRecord, StoreData } from "../types";
import { formatDate, formatMoney } from "../utils/storage";

interface RecycleBinModalProps {
  isOpen: boolean;
  deletedCustomers?: DeletedCustomerRecord[];
  deletedTransactions?: DeletedTransactionRecord[];
  onClose: () => void;
  onRestoreCustomer: (customerId: string) => void;
  onRestoreTransaction: (transactionId: string) => void;
  onPermanentDeleteCustomer: (customerId: string) => void;
  onPermanentDeleteTransaction: (transactionId: string) => void;
  onEmptyRecycleBin: () => void;
}

export const RecycleBinModal: React.FC<RecycleBinModalProps> = ({
  isOpen,
  deletedCustomers = [],
  deletedTransactions = [],
  onClose,
  onRestoreCustomer,
  onRestoreTransaction,
  onPermanentDeleteCustomer,
  onPermanentDeleteTransaction,
  onEmptyRecycleBin,
}) => {
  const [activeTab, setActiveTab] = useState<"customers" | "transactions">("customers");
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfirmEmpty, setShowConfirmEmpty] = useState(false);

  if (!isOpen) return null;

  const totalDeletedCount = deletedCustomers.length + deletedTransactions.length;

  // Filtered lists
  const filteredCustomers = deletedCustomers.filter((dc) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      dc.customer.name.toLowerCase().includes(q) ||
      (dc.customer.phone && dc.customer.phone.includes(q))
    );
  });

  const filteredTransactions = deletedTransactions.filter((dt) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (dt.customerName && dt.customerName.toLowerCase().includes(q)) ||
      (dt.transaction.note && dt.transaction.note.toLowerCase().includes(q)) ||
      dt.transaction.amount.toString().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200 no-print">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 relative flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center font-bold">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black font-display text-white flex items-center gap-2">
                تەنەکەی زبڵ (سڕاوەکان)
                {totalDeletedCount > 0 && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                    {totalDeletedCount} بڕگە
                  </span>
                )}
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                گەڕاندنەوەی قەرزدار و مامەڵە سڕاوەکان بۆ ناو سیستەم
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white bg-slate-800 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection & Search Bar */}
        <div className="bg-stone-50 p-4 border-b border-stone-200 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-stone-200/70 p-1 rounded-2xl">
              <button
                onClick={() => setActiveTab("customers")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === "customers"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <UserX className="w-4 h-4 text-red-600" />
                <span>قەرزدارە سڕاوەکان</span>
                <span className="px-1.5 py-0.2 text-[10px] bg-stone-100 rounded-full font-mono">
                  {deletedCustomers.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("transactions")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === "transactions"
                    ? "bg-white text-stone-900 shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <FileX className="w-4 h-4 text-amber-600" />
                <span>مامەڵە سڕاوەکان</span>
                <span className="px-1.5 py-0.2 text-[10px] bg-stone-100 rounded-full font-mono">
                  {deletedTransactions.length}
                </span>
              </button>
            </div>

            {totalDeletedCount > 0 && (
              <button
                onClick={() => setShowConfirmEmpty(true)}
                className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>بەتاڵکردنەوەی تەنەکەی زبڵ</span>
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="گەڕان لەناو سڕاوەکاندا..."
              className="w-full pr-10 pl-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        {/* Confirmation banner for emptying trash */}
        {showConfirmEmpty && (
          <div className="p-4 bg-red-50 border-b border-red-200 flex items-center justify-between text-xs text-red-900 animate-in slide-in-from-top duration-150">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>ئایا دڵنیایت لە سڕینەوەی یەکجارەکی تەواوی بڕگەکانی ناو تەنەکەی زبڵ؟ ئەمانە ناگەڕێندرێنەوە.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  onEmptyRecycleBin();
                  setShowConfirmEmpty(false);
                }}
                className="px-3 py-1.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
              >
                بەڵێ، بەتاڵی بکەوە
              </button>
              <button
                onClick={() => setShowConfirmEmpty(false)}
                className="px-3 py-1.5 bg-stone-200 text-stone-800 rounded-xl font-bold hover:bg-stone-300 transition"
              >
                پاشگەزبوونەوە
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 bg-stone-50/30">
          
          {/* TAB 1: DELETED CUSTOMERS */}
          {activeTab === "customers" && (
            <div>
              {filteredCustomers.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-xs">
                  {searchQuery ? "هیچ قەرزدارێکی سڕاوە لەگەڵ ئەم گەڕانەدا نەدۆزرایەوە." : "هیچ قەرزدارێک لە ناو تەنەکەی زبڵدا نییە."}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCustomers.map((dc) => {
                    const txCount = dc.transactions ? dc.transactions.length : 0;
                    const balance = dc.transactions
                      ? dc.transactions.reduce((sum, t) => sum + (t.type === "payment" ? -t.amount : t.amount), 0)
                      : 0;

                    return (
                      <div
                        key={dc.customer.id}
                        className="p-4 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-stone-300 transition"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-stone-900 text-sm font-display">
                              {dc.customer.name}
                            </h4>
                            {dc.customer.phone && (
                              <span className="text-xs text-stone-500 font-mono">
                                ({dc.customer.phone})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-stone-500 mt-1 flex-wrap">
                            <span>📦 هەڵگیراوەکان: <b>{txCount} مامەڵە</b></span>
                            <span>💰 باقی لە کاتی سڕینەوەدا: <b className={balance > 0 ? "text-red-600" : "text-emerald-700"}>{formatMoney(balance)}</b></span>
                            {dc.deletedAt && (
                              <span className="text-stone-400 font-mono text-[10px]">
                                ⏱️ بەرواری سڕینەوە: {formatDate(dc.deletedAt.slice(0, 10))}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            onClick={() => onRestoreCustomer(dc.customer.id)}
                            className="px-3.5 py-2 bg-[#008767] hover:bg-[#007256] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>گەڕاندنەوەی قەرزدار</span>
                          </button>

                          <button
                            onClick={() => onPermanentDeleteCustomer(dc.customer.id)}
                            className="p-2 text-red-600 hover:bg-red-50 border border-red-100 rounded-xl text-xs font-bold transition"
                            title="سڕینەوەی یەکجارەکی"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DELETED TRANSACTIONS */}
          {activeTab === "transactions" && (
            <div>
              {filteredTransactions.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-xs">
                  {searchQuery ? "هیچ مامەڵەیەکی سڕاوە لەگەڵ ئەم گەڕانەدا نەدۆزرایەوە." : "هیچ مامەڵەیەک لە ناو تەنەکەی زبڵدا نییە."}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTransactions.map((dt) => {
                    const isPayment = dt.transaction.type === "payment";

                    return (
                      <div
                        key={dt.transaction.id}
                        className="p-4 bg-white rounded-2xl border border-stone-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-stone-300 transition"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                              isPayment ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                            }`}>
                              {isPayment ? "وەرگرتنی پارە" : "قەرز"}
                            </span>
                            <span className="font-bold text-stone-900 text-xs font-display">
                              کڕیار: {dt.customerName || "دیاری نەکراو"}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-stone-600 mt-1 flex-wrap">
                            <span className="font-mono font-black text-stone-900">
                              بڕی پارە: {formatMoney(dt.transaction.amount)}
                            </span>
                            {dt.transaction.note && <span>تێبینی: {dt.transaction.note}</span>}
                            <span className="text-stone-400 font-mono text-[10px]">
                              📅 بەرواری مامەڵە: {formatDate(dt.transaction.date)}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            onClick={() => onRestoreTransaction(dt.transaction.id)}
                            className="px-3.5 py-2 bg-[#008767] hover:bg-[#007256] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>گەڕاندنەوەی مامەڵە</span>
                          </button>

                          <button
                            onClick={() => onPermanentDeleteTransaction(dt.transaction.id)}
                            className="p-2 text-red-600 hover:bg-red-50 border border-red-100 rounded-xl text-xs font-bold transition"
                            title="سڕینەوەی یەکجارەکی"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-stone-200 flex items-center justify-between">
          <span className="text-xs text-stone-400 font-medium">
            گواستنەوەی داتاکان بۆ تەنەکەی زبڵ ڕێگری دەکات لە لەدەستدانی سەرپێیی داتاکانت.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition"
          >
            داخستن
          </button>
        </div>

      </div>
    </div>
  );
};

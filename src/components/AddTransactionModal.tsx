import React, { useState, useEffect } from "react";
import { X, ArrowUpRight, ArrowDownLeft, Utensils, Zap, Package, Calendar, FileText, AlertTriangle, RotateCcw, Info, User, ShoppingBag } from "lucide-react";
import { Customer, ItemCategory, Transaction, TransactionType, UserProfile } from "../types";
import { todayISO, loadDraftTransaction, saveDraftTransaction, clearDraftTransaction, DraftTransaction } from "../utils/storage";
import { calculateCustomerCreditRating } from "../utils/creditRating";

interface AddTransactionModalProps {
  isOpen: boolean;
  customers: Customer[];
  transactions?: Transaction[];
  preSelectedCustomerId?: string;
  defaultType?: TransactionType;
  activeUser: UserProfile;
  savedItems?: string[];
  onClose: () => void;
  onAddTransaction: (data: {
    customerId: string;
    type: TransactionType;
    amount: number;
    date: string;
    category?: ItemCategory;
    note?: string;
  }) => void;
  onAddCustomer?: (customerData: {
    name: string;
    phone: string;
    code?: string;
    address?: string;
    notes?: string;
    initialDebt?: number;
  }) => Customer;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  customers,
  transactions = [],
  preSelectedCustomerId,
  defaultType = "daily_debt",
  activeUser,
  savedItems = [],
  onClose,
  onAddTransaction,
  onAddCustomer,
}) => {
  const [customerId, setCustomerId] = useState(preSelectedCustomerId || "");
  const [type, setType] = useState<TransactionType>(() => {
    if (defaultType === "general_debt" || defaultType === "debt") return "general_debt";
    if (defaultType === "daily_receivable") return "daily_receivable";
    if (defaultType === "payment") return "payment";
    return "daily_debt";
  });
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ItemCategory>("chicken");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [pendingDraft, setPendingDraft] = useState<DraftTransaction | null>(null);

  // Quick Add Customer Sub-Popup State
  const [isAddCustomerPopupOpen, setIsAddCustomerPopupOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustNotes, setNewCustNotes] = useState("");
  const [popupError, setPopupError] = useState<string | null>(null);

  const handleQuickAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPopupError(null);
    const trimmedName = newCustName.trim();
    if (!trimmedName) {
      setPopupError("تکایە ناوی قەرزدار بنووسە");
      return;
    }

    const isNameDuplicate = customers.some(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (isNameDuplicate) {
      setPopupError("ئەم ناوە پێشتر تۆمارکراوە!");
      return;
    }

    if (onAddCustomer) {
      const created = onAddCustomer({
        name: trimmedName,
        phone: newCustPhone.trim(),
        address: newCustAddress.trim() || undefined,
        notes: newCustNotes.trim() || undefined,
      });

      if (created && created.id) {
        setCustomerId(created.id);
      }
    }

    setNewCustName("");
    setNewCustPhone("");
    setNewCustAddress("");
    setNewCustNotes("");
    setPopupError(null);
    setIsAddCustomerPopupOpen(false);
  };

  // Check for unsaved draft on open or mount
  useEffect(() => {
    if (!isOpen) return;

    if (preSelectedCustomerId) setCustomerId(preSelectedCustomerId);
    
    let initialType: TransactionType = "daily_debt";
    if (defaultType === "general_debt" || defaultType === "debt") {
      initialType = "general_debt";
    } else if (defaultType === "daily_receivable") {
      initialType = "daily_receivable";
    } else if (defaultType === "payment") {
      initialType = "payment";
    } else if (defaultType === "daily_debt") {
      initialType = "daily_debt";
    }
    setType(initialType);

    const draft = loadDraftTransaction();
    if (draft && (draft.amount || draft.note || draft.customerId)) {
      setPendingDraft(draft);
    } else {
      setPendingDraft(null);
    }
  }, [preSelectedCustomerId, defaultType, isOpen]);

  // Auto-save form changes into localStorage draft
  useEffect(() => {
    if (!isOpen) return;
    if (customerId || amount || note) {
      saveDraftTransaction({
        customerId,
        type,
        amount,
        category,
        date,
        note,
      });
    }
  }, [customerId, type, amount, category, date, note, isOpen]);

  if (!isOpen) return null;

  // Autocomplete suggestions for item description (only in temporary debt mode)
  const suggestions = (type === "daily_debt" && note.trim())
    ? savedItems.filter(
        (item) => item.toLowerCase().includes(note.trim().toLowerCase()) && item !== note.trim()
      )
    : [];

  const handleRestoreDraft = () => {
    if (pendingDraft) {
      if (pendingDraft.customerId) setCustomerId(pendingDraft.customerId);
      if (pendingDraft.type) setType(pendingDraft.type);
      if (pendingDraft.amount) setAmount(pendingDraft.amount);
      if (pendingDraft.category) setCategory(pendingDraft.category as ItemCategory);
      if (pendingDraft.date) setDate(pendingDraft.date);
      if (pendingDraft.note) setNote(pendingDraft.note);
      setPendingDraft(null);
    }
  };

  const handleDiscardDraft = () => {
    clearDraftTransaction();
    setPendingDraft(null);
    setAmount("");
    setNote("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !amount || parseFloat(amount) <= 0) return;

    onAddTransaction({
      customerId,
      type,
      amount: parseFloat(amount),
      date,
      category: type === "daily_debt" || type === "daily_receivable" ? category : undefined,
      note: note.trim() || undefined,
    });

    // Clear draft storage upon successful save
    clearDraftTransaction();
    setPendingDraft(null);

    // Reset
    setAmount("");
    setNote("");
    onClose();
  };

  // Dynamic header styles & titles based on selected Transaction Type
  const getHeaderInfo = () => {
    switch (type) {
      case "general_debt":
      case "debt":
        return {
          title: "تۆمارکردنی قەرزی گشتی",
          subtitle: "سیستەمی قەرزی گشتی - کڕیارانی بەردەوام",
          bgColor: "bg-blue-700",
          icon: <User className="w-5 h-5" />,
        };
      case "daily_debt":
        return {
          title: "تۆمارکردنی قەرزی کاتی",
          subtitle: "سیستەمی قەرزی کاتی - کاڵا و فرۆشتن",
          bgColor: "bg-[#008767]",
          icon: <ShoppingBag className="w-5 h-5" />,
        };
      case "daily_receivable":
        return {
          title: "تۆمارکردنی قەرز پێدان",
          subtitle: "پارە بەخشین / داواکاری کاتی",
          bgColor: "bg-indigo-700",
          icon: <ArrowUpRight className="w-5 h-5" />,
        };
      case "payment":
        return {
          title: "تۆمارکردنی قەرز وەرگرتن",
          subtitle: "وەرگرتنی پارە / دانەوەی قەرز",
          bgColor: "bg-emerald-800",
          icon: <ArrowDownLeft className="w-5 h-5" />,
        };
      default:
        return {
          title: "تۆمارکردنی مامەڵە",
          subtitle: "تۆمارکردنی قەرز یان دانەوە",
          bgColor: "bg-stone-900",
          icon: <User className="w-5 h-5" />,
        };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-md overflow-hidden my-auto">
        
        {/* Header */}
        <div className={`p-5 text-white flex items-center justify-between transition-colors duration-200 ${headerInfo.bgColor}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              {headerInfo.icon}
            </div>
            <div>
              <h3 className="font-bold text-base font-display">
                {headerInfo.title}
              </h3>
              <p className="text-[11px] text-white/80">
                {headerInfo.subtitle} • تۆمارکار: {activeUser.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white bg-black/10 hover:bg-black/20 rounded-full transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Draft Transaction Detection Alert Banner */}
          {pendingDraft && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex flex-col gap-2.5 animate-in fade-in duration-150 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-amber-200 text-amber-900 rounded-xl shrink-0 mt-0.5">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-black text-amber-950 text-xs">
                    مامەڵەیەکی ناتەواوت هەیە، دەتەوێت بەردەوام بیت؟
                  </div>
                  <div className="text-[11px] text-amber-800 font-medium mt-0.5 dir-rtl">
                    {pendingDraft.amount ? `• بڕ: ${parseFloat(pendingDraft.amount).toLocaleString()} IQD ` : ""}
                    {pendingDraft.note ? `• وەسف: ${pendingDraft.note}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200/80">
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-xl text-xs transition"
                >
                  هەڵوەشاندنەوە
                </button>
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs shadow-xs transition"
                >
                  بەردەوام بە
                </button>
              </div>
            </div>
          )}

          {/* 1. Transaction Type Selector (جۆری مامەڵە) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              جۆری مامەڵە (Transaction Type):
            </label>
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-stone-100 rounded-2xl text-xs font-bold">
              
              {/* Option 1: General Debt (قەرزی گشتی) */}
              <button
                type="button"
                onClick={() => setType("general_debt")}
                className={`py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  type === "general_debt" || type === "debt"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-stone-700 hover:bg-stone-200 border border-stone-200/60"
                }`}
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span>قەرزی گشتی</span>
              </button>

              {/* Option 2: Temporary Debt (قەرزی کاتی) */}
              <button
                type="button"
                onClick={() => setType("daily_debt")}
                className={`py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  type === "daily_debt"
                    ? "bg-[#008767] text-white shadow-xs"
                    : "bg-white text-stone-700 hover:bg-stone-200 border border-stone-200/60"
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                <span>قەرزی کاتی</span>
              </button>

              {/* Option 3: Lend Money (قەرز پێدان) */}
              <button
                type="button"
                onClick={() => setType("daily_receivable")}
                className={`py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  type === "daily_receivable"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-stone-700 hover:bg-stone-200 border border-stone-200/60"
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                <span>قەرز پێدان</span>
              </button>

              {/* Option 4: Receive Money (قەرز وەرگرتن) */}
              <button
                type="button"
                onClick={() => setType("payment")}
                className={`py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  type === "payment"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white text-stone-700 hover:bg-stone-200 border border-stone-200/60"
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" />
                <span>قەرز وەرگرتن</span>
              </button>

            </div>
          </div>

          {/* 2. Select Customer */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              دیاریکردنی کڕیار <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="flex-1 min-w-0 px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#008767]/20"
              >
                <option value="">-- ناوی کڕیار هەڵبژێرە --</option>
                {customers.map((c) => {
                  const rating = calculateCustomerCreditRating(c.id, transactions);
                  return (
                    <option key={c.id} value={c.id}>
                      {rating.dotColor} [{rating.grade}] {c.name} {c.code ? `[ژمارە: #${c.code}]` : ""} ({c.phone || "بێ ژمارە"})
                    </option>
                  );
                })}
              </select>
              <button
                type="button"
                onClick={() => setIsAddCustomerPopupOpen(true)}
                className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-2xs transition shrink-0 flex items-center gap-1"
              >
                ➕ قەرزداری نوێ
              </button>
            </div>
          </div>

          {/* Credit Rating Warning Alert Banner for Grade D / High Risk Customer */}
          {(() => {
            if (!customerId || type === "payment") return null;
            const rating = calculateCustomerCreditRating(customerId, transactions);
            if (rating.grade !== "D" && rating.grade !== "C") return null;

            return (
              <div className={`p-3.5 rounded-2xl border flex items-start gap-3 animate-in fade-in duration-150 ${
                rating.grade === "D"
                  ? "bg-rose-50 border-rose-300 text-rose-950"
                  : "bg-orange-50 border-orange-300 text-orange-950"
              }`}>
                <div className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${
                  rating.grade === "D" ? "bg-rose-200/80 text-rose-800" : "bg-orange-200/80 text-orange-800"
                }`}>
                  <AlertTriangle className="w-4 h-4 animate-bounce" />
                </div>
                <div className="text-xs space-y-1">
                  <div className="font-extrabold flex items-center gap-1">
                    <span>
                      {rating.dotColor} ئاگاداربە! پلەی متمانەی ئەم کڕیارە ({rating.title} - {rating.grade}) یە
                    </span>
                  </div>
                  <p className="opacity-90 font-medium leading-relaxed">
                    {rating.description}
                  </p>
                  {rating.metrics.oldestDebtDays > 0 && (
                    <p className="font-bold opacity-100 font-mono text-[11px] pt-0.5">
                      • تەمەنی کۆتا قەرزی بەسەرچوو: {rating.metrics.oldestDebtDays} ڕۆژ
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Category selection - Only for Temporary Debt / Goods */}
          {type === "daily_debt" && (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                جۆری کاڵاکە
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCategory("chicken")}
                  className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-bold transition ${
                    category === "chicken"
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : "bg-stone-50 text-stone-600 border-stone-200"
                  }`}
                >
                  <Utensils className="w-4 h-4 text-amber-700" />
                  <span>مریشک</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory("electrical")}
                  className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-bold transition ${
                    category === "electrical"
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : "bg-stone-50 text-stone-600 border-stone-200"
                  }`}
                >
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>کارەبایی</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory("other")}
                  className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-bold transition ${
                    category === "other"
                      ? "bg-stone-200 text-stone-900 border-stone-400"
                      : "bg-stone-50 text-stone-600 border-stone-200"
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>تر</span>
                </button>
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
              <span>بڕی پارە (IQD) <span className="text-red-500">*</span></span>
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min="250"
                step="250"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-12 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-base font-black tabular focus:outline-none focus:ring-2 focus:ring-[#008767]/20"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                IQD
              </span>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
              {[5000, 10000, 25000, 50000, 100000].map((quickAmt) => (
                <button
                  key={quickAmt}
                  type="button"
                  onClick={() => setAmount(quickAmt.toString())}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold rounded-lg transition shrink-0"
                >
                  +{quickAmt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Description / Note */}
          <div className="relative">
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-stone-400" />
              {type === "daily_debt" ? "وەسف / ناوی کاڵا (ئۆتۆکۆمپلیت)" : "تێبینی / بابەت"}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={type === "daily_debt" ? "نموونە: مریشک، پلاک..." : "تێبینی یان بابەت بنووسە (ئیختیاری)..."}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#008767]/20"
            />

            {/* Smart Autocomplete Suggestions Dropdown (Only for Temporary Debt) */}
            {suggestions.length > 0 && (
              <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-36 overflow-y-auto divide-y divide-stone-100">
                {suggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setNote(sug)}
                    className="w-full text-right px-3 py-2 text-xs text-stone-700 hover:bg-emerald-50 hover:text-[#008767] font-medium"
                  >
                    💡 {sug}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              بەروار
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#008767]/20"
            />
          </div>

          {/* Context Banner at Bottom */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-stone-700">
            <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">
              {type === "general_debt" && "ئەم مامەڵەیە تەنها بۆ بەشی قەرزی گشتی تۆمار دەکرێت."}
              {type === "daily_debt" && "ئەم مامەڵەیە تەنها بۆ بەشی قەرزی کاتی تۆمار دەکرێت."}
              {type === "daily_receivable" && "ئەم مامەڵەیە وەکو قەرزپێدان (داواکاری) تۆمار دەکرێت."}
              {type === "payment" && "ئەم مامەڵەیە وەکو وەرگرتنی پارە (دانەوەی قەرز) تۆمار دەکرێت."}
            </span>
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition"
            >
              هەڵوەشاندنەوە
            </button>
            <button
              type="submit"
              className={`px-6 py-2.5 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 ${
                type === "general_debt"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : type === "daily_receivable"
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : type === "payment"
                  ? "bg-emerald-700 hover:bg-emerald-800"
                  : "bg-[#008767] hover:bg-[#007256]"
              }`}
            >
              تۆمارکردن
            </button>
          </div>

        </form>

      </div>

      {/* Quick Add Customer Sub-Popup Modal */}
      {isAddCustomerPopupOpen && (
        <div className="fixed inset-0 z-60 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-sm overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h4 className="font-bold text-sm text-stone-900 flex items-center gap-1.5">
                <span>➕</span> زیاده‌كردنی قەرزداری نوێ
              </h4>
              <button
                type="button"
                onClick={() => {
                  setIsAddCustomerPopupOpen(false);
                  setPopupError(null);
                }}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {popupError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                {popupError}
              </div>
            )}

            <form onSubmit={handleQuickAddCustomerSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  ناوی قەرزدار <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => {
                    setNewCustName(e.target.value);
                    if (popupError) setPopupError(null);
                  }}
                  placeholder="ناوی سیانی یان ناسیار..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  ژمارەی مۆبایل <span className="text-stone-400 font-normal">(ئیختیاری)</span>
                </label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="0750XXXXXXX"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dir-ltr text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  ناونیشان <span className="text-stone-400 font-normal">(ئیختیاری)</span>
                </label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="ناونیشان..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  تێبینی <span className="text-stone-400 font-normal">(ئیختیاری)</span>
                </label>
                <textarea
                  rows={2}
                  value={newCustNotes}
                  onChange={(e) => setNewCustNotes(e.target.value)}
                  placeholder="تێبینی..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddCustomerPopupOpen(false);
                    setPopupError(null);
                  }}
                  className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition"
                >
                  هەڵوەشاندنەوە
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  پاشەکەوتکردن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};



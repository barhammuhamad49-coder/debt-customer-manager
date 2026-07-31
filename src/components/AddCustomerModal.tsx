import React, { useState, useEffect } from "react";
import { X, UserPlus, Phone, MapPin, FileText, DollarSign, AlertCircle, Hash, RefreshCw, Calendar, Check } from "lucide-react";
import { Customer, CustomerIdConfig, DeletedCustomerRecord, UserProfile } from "../types";
import { DEFAULT_CUSTOMER_ID_CONFIG, generateNextCustomerId, isCustomerIdDuplicate } from "../utils/storage";
import { WEEK_DAYS } from "../utils/visitDays";

interface AddCustomerModalProps {
  isOpen: boolean;
  customers: Customer[];
  activeUser: UserProfile;
  savedItems?: string[];
  deletedCustomers?: DeletedCustomerRecord[];
  customerIdConfig?: CustomerIdConfig;
  onClose: () => void;
  onAddCustomer: (customerData: {
    name: string;
    phone: string;
    code?: string;
    address?: string;
    notes?: string;
    initialDebt?: number;
    visitDays?: string[];
  }) => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  customers,
  activeUser,
  savedItems = [],
  deletedCustomers = [],
  customerIdConfig = DEFAULT_CUSTOMER_ID_CONFIG,
  onClose,
  onAddCustomer,
}) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [initialDebt, setInitialDebt] = useState("");
  const [visitDays, setVisitDays] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute suggested automatic Customer ID
  const { newCode: autoSuggestedCode } = generateNextCustomerId(customers, deletedCustomers, customerIdConfig);

  useEffect(() => {
    if (isOpen) {
      // Pre-fill with auto-generated code if enabled and code field is empty
      if (customerIdConfig.enabled && !code) {
        setCode(autoSuggestedCode);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Autocomplete matching
  const suggestions = name.trim()
    ? savedItems.filter(
        (item) => item.toLowerCase().includes(name.trim().toLowerCase()) && item !== name.trim()
      )
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg("تکایە ناوی کڕیار بنووسە");
      return;
    }

    // Check duplicate customer name requirement
    const isNameDuplicate = customers.some(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (isNameDuplicate) {
      setErrorMsg("ئەم ناوە پێشتر تۆمارکراوە!");
      return;
    }

    // Determine final code
    const finalCode = (code.trim() || autoSuggestedCode).trim();

    // Validate Customer ID duplicate check
    if (isCustomerIdDuplicate(finalCode, null, customers, deletedCustomers)) {
      setErrorMsg(`ئەم Customer ID یە (${finalCode}) پێشتر بەکار هاتووە! پێویستە ژمارەی ناوازە و نەدووبارەبووەوە بێت.`);
      return;
    }

    onAddCustomer({
      name: trimmedName,
      phone: phone.trim(),
      code: finalCode,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
      initialDebt: initialDebt ? parseFloat(initialDebt) : 0,
      visitDays: visitDays.length > 0 ? visitDays : undefined,
    });

    // Reset
    setName("");
    setPhone("");
    setCode("");
    setAddress("");
    setNotes("");
    setInitialDebt("");
    setVisitDays([]);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-md overflow-hidden my-auto">
        
        {/* Header */}
        <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#008767] flex items-center justify-center text-white">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base font-display text-amber-100">
                تۆمارکردنی کڕیاری نوێ
              </h3>
              <p className="text-[11px] text-stone-400">
                تۆمارکار: {activeUser.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white bg-stone-800 rounded-full transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Customer Name + Autocomplete */}
          <div className="relative">
            <label className="block text-xs font-bold text-stone-700 mb-1">
              ناوی سیانی کڕیار <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="نموونە: بەرهەم، مەریوان..."
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#008767]/20 focus:border-[#008767]"
            />

            {/* Smart Autocomplete Dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-36 overflow-y-auto divide-y divide-stone-100">
                {suggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setName(sug)}
                    className="w-full text-right px-3 py-2 text-xs text-stone-700 hover:bg-emerald-50 hover:text-[#008767] font-medium"
                  >
                    💡 {sug}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-stone-400" />
              ژمارەی مۆبایل
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0750XXXXXXX"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-mono dir-ltr focus:outline-none focus:ring-2 focus:ring-[#008767]/20 focus:border-[#008767] text-right"
            />
          </div>

          {/* Customer Code / Number (Customer ID) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-[#008767]" />
                ژمارە / Customer ID خاوەن قەرز
              </span>
              <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                خودکار: {autoSuggestedCode}
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder={`خودکار: ${autoSuggestedCode}`}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-mono dir-ltr focus:outline-none focus:ring-2 focus:ring-[#008767]/20 focus:border-[#008767] text-right pl-10"
              />
              <button
                type="button"
                onClick={() => setCode(autoSuggestedCode)}
                title="بەکارهێنانی کۆدی خودکار"
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-[#008767] transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-stone-400 mt-1">
              ئەگەر بە بەتاڵی بەجێی بهێڵیت، ژمارەی خودکاری ({autoSuggestedCode}) بۆ دادەنرێت.
            </p>
          </div>

          {/* Initial Debt */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-red-500" />
              قەرزی کۆنی پێشوو (ئەگەر هەبێت) - د.ع
            </label>
            <input
              type="number"
              min="0"
              step="500"
              value={initialDebt}
              onChange={(e) => setInitialDebt(e.target.value)}
              placeholder="0"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-bold tabular focus:outline-none focus:ring-2 focus:ring-[#008767]/20 focus:border-[#008767]"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              ناونیشان / کوچه
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="نموونە: شەقامی بەختیاری"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#008767]/20 focus:border-[#008767]"
            />
          </div>

          {/* Weekly Visit Days (ڕۆژانی سەردانی هەفتانە) */}
          <div className="space-y-1.5 p-3 bg-stone-50 border border-stone-200 rounded-2xl">
            <label className="block text-xs font-bold text-stone-700 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#008767]" />
                ڕۆژانی سەردانی هەفتانە
              </span>
              <span className="text-[10px] text-stone-500 font-normal">
                {visitDays.length > 0 ? `${visitDays.length} ڕۆژ دیاریکراوە` : "هیچ دیاری نەکراوە"}
              </span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
              {WEEK_DAYS.map((day) => {
                const isSelected = visitDays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setVisitDays(visitDays.filter((d) => d !== day.id));
                      } else {
                        setVisitDays([...visitDays, day.id]);
                      }
                    }}
                    className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition flex flex-col items-center justify-center gap-0.5 border ${
                      isSelected
                        ? "bg-[#008767] text-white border-[#008767] shadow-2xs"
                        : "bg-white text-stone-600 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    <span className="truncate">{day.name}</span>
                    {isSelected && <Check className="w-3 h-3 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-stone-400" />
              تێبینی تر
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="تێبینی تایبەت بە کڕیار..."
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#008767]/20 focus:border-[#008767] resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition"
            >
              پاشگەزبوونەوە
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#008767] hover:bg-[#007256] text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              تۆمارکردن
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};


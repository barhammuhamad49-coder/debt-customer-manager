import React, { useState, useMemo } from "react";
import { Plus, Search, CheckCircle2, Clock, Trash2, Edit3, Calendar, FileSpreadsheet, Printer, User, AlertCircle, ShoppingBag, Share2, Mic } from "lucide-react";
import { DailyRequest, Customer, UserProfile } from "../types";
import { formatDate, generateUID, todayISO } from "../utils/storage";
import { AutocompleteInput } from "./AutocompleteInput";
import { VoiceModeModal } from "./VoiceModeModal";
import * as XLSX from "xlsx";

interface DailyRequestsViewProps {
  dailyRequests: DailyRequest[];
  customers: Customer[];
  activeUser: UserProfile;
  savedItems?: string[];
  onSaveDailyRequests: (requests: DailyRequest[]) => void;
  onSaveNewSavedItem?: (item: string) => void;
}

export const DailyRequestsView: React.FC<DailyRequestsViewProps> = ({
  dailyRequests = [],
  customers,
  activeUser,
  savedItems = [],
  onSaveDailyRequests,
  onSaveNewSavedItem,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [periodFilter, setPeriodFilter] = useState<"all" | "today" | "week" | "month">("all");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<DailyRequest | null>(null);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  // Form Fields
  const [requestName, setRequestName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customCustomerName, setCustomCustomerName] = useState("");
  const [reqDate, setReqDate] = useState(todayISO());
  const [reqStatus, setReqStatus] = useState<"pending" | "completed">("pending");
  const [reqNote, setReqNote] = useState("");

  const todayStr = todayISO();

  // Reset Form
  const resetForm = () => {
    setEditingRequest(null);
    setRequestName("");
    setQuantity("١ دانە");
    setSelectedCustomerId(customers[0]?.id || "");
    setCustomCustomerName("");
    setReqDate(todayISO());
    setReqStatus("pending");
    setReqNote("");
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (req: DailyRequest) => {
    setEditingRequest(req);
    setRequestName(req.requestName);
    setQuantity(String(req.quantity));
    setSelectedCustomerId(req.customerId || "");
    setCustomCustomerName(req.customerName || "");
    setReqDate(req.date || todayISO());
    setReqStatus(req.status);
    setReqNote(req.note || "");
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestName.trim()) return;

    const matchedCustomer = customers.find((c) => c.id === selectedCustomerId);
    const finalCustName = matchedCustomer ? matchedCustomer.name : customCustomerName || "کڕیاری گشتی";

    if (editingRequest) {
      // Update existing
      const updated = dailyRequests.map((r) =>
        r.id === editingRequest.id
          ? {
              ...r,
              requestName,
              quantity,
              customerId: selectedCustomerId,
              customerName: finalCustName,
              date: reqDate,
              status: reqStatus,
              note: reqNote,
            }
          : r
      );
      onSaveDailyRequests(updated);
    } else {
      // Create new
      const newReq: DailyRequest = {
        id: generateUID(),
        requestName,
        quantity,
        customerId: selectedCustomerId,
        customerName: finalCustName,
        date: reqDate,
        status: reqStatus,
        note: reqNote,
        createdByUserId: activeUser.id,
        createdByName: activeUser.name,
        createdAt: new Date().toISOString(),
      };
      onSaveDailyRequests([newReq, ...dailyRequests]);
    }

    if (onSaveNewSavedItem && requestName) {
      onSaveNewSavedItem(requestName);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("ئایا دڵنیایت لە سڕینەوەی ئەم داواکارییە؟")) {
      const updated = dailyRequests.filter((r) => r.id !== id);
      onSaveDailyRequests(updated);
    }
  };

  const handleToggleStatus = (req: DailyRequest) => {
    const nextStatus = req.status === "pending" ? "completed" : "pending";
    const updated = dailyRequests.map((r) => (r.id === req.id ? { ...r, status: nextStatus } : r));
    onSaveDailyRequests(updated);
  };

  // Filtered Daily Requests
  const filteredRequests = useMemo(() => {
    return dailyRequests.filter((r) => {
      // Status filter
      if (statusFilter !== "all" && r.status !== statusFilter) return false;

      // Date period filter
      if (periodFilter === "today" && r.date !== todayStr) return false;
      if (periodFilter === "week") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        if (r.date < d.toISOString().slice(0, 10)) return false;
      }
      if (periodFilter === "month") {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        if (r.date < d.toISOString().slice(0, 10)) return false;
      }

      // Search Query
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      const matchedCust = customers.find((c) => c.id === r.customerId);
      return (
        r.requestName.toLowerCase().includes(q) ||
        (r.customerName && r.customerName.toLowerCase().includes(q)) ||
        (r.note && r.note.toLowerCase().includes(q)) ||
        (matchedCust?.code && matchedCust.code.toLowerCase().includes(q))
      );
    });
  }, [dailyRequests, searchQuery, statusFilter, periodFilter, todayStr]);

  // Export Excel
  const handleExportExcel = () => {
    const data = filteredRequests.map((r, index) => ({
      "#": index + 1,
      "ناوی داواکاری": r.requestName,
      "بڕ / عەدەد": r.quantity,
      "ناوی کڕیار": r.customerName || "-",
      "بەروار": r.date,
      "بارودۆخ": r.status === "completed" ? "تەواوکراوە" : "چاوەڕوانکراو",
      "تێبینی": r.note || "-",
      "تۆمارکار": r.createdByName || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    if (!worksheet["!views"]) worksheet["!views"] = [];
    worksheet["!views"].push({ RTL: true });
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "داواکارییە_ڕۆژانەکان");
    XLSX.writeFile(workbook, `Dawakariekan_${todayStr}.xlsx`);
  };

  // Printable A4 HTML Report
  const handlePrintRequests = () => {
    const printWin = window.open("", "_blank", "width=850,height=950");
    if (!printWin) return;

    const rowsHtml = filteredRequests
      .map(
        (r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${r.requestName}</strong></td>
        <td>${r.quantity}</td>
        <td>${r.customerName || "—"}</td>
        <td>${r.date}</td>
        <td>
          <span style="padding: 2px 8px; border-radius: 12px; font-weight: bold; font-size: 11px; background: ${
            r.status === "completed" ? "#dcfce7; color: #15803d" : "#fef3c7; color: #b45309"
          }">
            ${r.status === "completed" ? "تەواوکراوە" : "چاوەڕوانکراو"}
          </span>
        </td>
        <td>${r.note || "—"}</td>
      </tr>
    `
      )
      .join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ckb">
      <head>
        <meta charset="UTF-8">
        <title>ڕاپۆرتی داواکارییە ڕۆژانەکان - ${todayStr}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700;900&display=swap');
          body { font-family: 'Vazirmatn', sans-serif; padding: 20px; direction: rtl; }
          h2 { color: #1d4ed8; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #1e3a8a; color: white; padding: 8px 12px; text-align: right; }
          td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
        </style>
      </head>
      <body>
        <h2>📦 ڕاپۆرتی داواکارییە ڕۆژانەکان</h2>
        <div style="margin-top: 6px; margin-bottom: 10px; padding: 6px 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 11px; display: inline-block;">
          <div style="display: flex; gap: 20px;">
            <div>
              <div style="color: #64748b; font-weight: bold;">خاوەنی دووکان:</div>
              <div style="font-weight: bold; font-size: 12px; color: #0f172a;">مەریوان</div>
              <div style="direction: ltr; font-weight: bold; color: #1d4ed8;">📞 07501335304</div>
            </div>
            <div style="border-right: 1px solid #cbd5e1; padding-right: 20px;">
              <div style="color: #64748b; font-weight: bold;">بەکارهێنەر:</div>
              <div style="font-weight: bold; font-size: 12px; color: #0f172a;">بەرهەم</div>
              <div style="direction: ltr; font-weight: bold; color: #1d4ed8;">📞 07508415775</div>
            </div>
          </div>
        </div>
        <p>بەروار: ${formatDate(todayStr)} | کۆی داواکارییەکان: ${filteredRequests.length}</p>
        <table>
          <thead>
            <tr><th>#</th><th>داواکاری</th><th>بڕ</th><th>کڕیار</th><th>بەروار</th><th>دۆخ</th><th>تێبینی</th></tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  // Share text summary
  const handleShareRequests = () => {
    const text = `📦 *لیستی داواکارییە ڕۆژانەکان*\n📅 بەروار: ${formatDate(todayStr)}\n📊 کۆی داواکاری: ${filteredRequests.length}\n\n` +
      filteredRequests
        .map((r, i) => `${i + 1}. ${r.requestName} (${r.quantity}) - ${r.customerName || "نادیار"} [${r.status === "completed" ? "✅" : "⏳"}]`)
        .join("\n");

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const pendingCount = dailyRequests.filter((r) => r.status === "pending").length;
  const completedCount = dailyRequests.filter((r) => r.status === "completed").length;

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-20 no-print">
      
      {/* Top Banner & Action Buttons */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-stone-900 font-display flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-blue-600" />
            بەشی داواکارییە ڕۆژانەکان
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            تۆمارکردن و بەڕێوەبردنی داواکارییە ڕۆژانەکانی کڕیاران
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            title="دابەزاندنی Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>ئێکسل</span>
          </button>

          <button
            onClick={handlePrintRequests}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            title="چاپکردنی A4 / PDF"
          >
            <Printer className="w-4 h-4 text-blue-700" />
            <span>چاپ / PDF</span>
          </button>

          <button
            onClick={handleShareRequests}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            title="ناردن بۆ وەتسئاپ"
          >
            <Share2 className="w-4 h-4 text-emerald-600" />
            <span>ناردن</span>
          </button>

          <button
            onClick={() => setIsVoiceOpen(true)}
            className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shadow-2xs active:scale-95"
            title="تۆمارکردن یان گەڕانی داواکاری بە دەنگ 🎤 (Voice Mode)"
          >
            <Mic className="w-4 h-4 text-red-600 animate-pulse" />
            <span>دەنگی 🎤</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>داواکاری نوێ</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-blue-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-stone-500">کۆی داواکارییەکان</span>
            <span className="text-lg font-black text-stone-900 font-mono">{dailyRequests.length}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            📋
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="block text-xs font-bold text-amber-700">چاوەڕوانکراو (Pending)</span>
            <span className="text-lg font-black text-amber-700 font-mono">{pendingCount}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <span className="block text-xs font-bold text-emerald-800">تەواوکراو (Completed)</span>
            <span className="text-lg font-black text-[#008767] font-mono">{completedCount}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#008767] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Autocomplete Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs font-bold">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl transition ${
                statusFilter === "all" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              هەمووی ({dailyRequests.length})
            </button>

            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-xl transition ${
                statusFilter === "pending" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              ⏳ چاوەڕوانکراو ({pendingCount})
            </button>

            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1.5 rounded-xl transition ${
                statusFilter === "completed" ? "bg-[#008767] text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              ✅ تەواوکراو ({completedCount})
            </button>
          </div>

          {/* Period Filter Buttons */}
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setPeriodFilter("today")}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                periodFilter === "today" ? "bg-blue-100 text-blue-800" : "text-stone-500 hover:bg-stone-100"
              }`}
            >
              ئەمڕۆ
            </button>

            <button
              onClick={() => setPeriodFilter("week")}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                periodFilter === "week" ? "bg-blue-100 text-blue-800" : "text-stone-500 hover:bg-stone-100"
              }`}
            >
              هەفتانە
            </button>

            <button
              onClick={() => setPeriodFilter("all")}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                periodFilter === "all" ? "bg-stone-200 text-stone-800" : "text-stone-500 hover:bg-stone-100"
              }`}
            >
              سەرجەم
            </button>
          </div>

        </div>

        {/* Smart Search Bar */}
        <AutocompleteInput
          value={searchQuery}
          onChange={setSearchQuery}
          savedItems={savedItems}
          placeholder="گەڕان لە داواکاری، ناوی کڕیار، یان تێبینی..."
          onSaveNewItem={onSaveNewSavedItem}
        />
      </div>

      {/* Request Cards List */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs overflow-hidden divide-y divide-stone-100">
        {filteredRequests.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <p className="text-xs text-stone-400">هیچ داواکارییەک لەم فلتەرەدا نییە.</p>
            <button
              onClick={handleOpenAddModal}
              className="mt-2 text-xs font-bold text-blue-600 hover:underline"
            >
              + تۆمارکردنی داواکاری نوێ
            </button>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isCompleted = req.status === "completed";

            return (
              <div
                key={req.id}
                className="p-4 hover:bg-stone-50/80 transition flex items-start justify-between gap-3 group"
              >
                
                {/* Status Toggle Badge & Details */}
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleStatus(req)}
                    className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center transition ${
                      isCompleted
                        ? "bg-emerald-100 text-[#008767] hover:bg-emerald-200"
                        : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    }`}
                    title={isCompleted ? "گۆڕین بۆ چاوەڕوانکراو" : "نیشانکردن وەک تەواوکراو"}
                  >
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </button>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`font-bold text-sm font-display ${isCompleted ? "line-through text-stone-400" : "text-stone-900"}`}>
                        {req.requestName}
                      </h4>

                      <span className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-mono">
                        بڕ: {req.quantity}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isCompleted ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {isCompleted ? "تەواوکراوە" : "چاوەڕوانکراوە"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                      <span className="flex items-center gap-1 font-bold">
                        <User className="w-3.5 h-3.5 text-stone-400" />
                        {req.customerName || "کڕیاری گشتی"}
                        {(() => {
                          const matchedC = customers.find((c) => c.id === req.customerId);
                          return matchedC?.code ? (
                            <span className="text-[10px] font-mono font-bold text-blue-900 bg-blue-100 border border-blue-200 px-1.5 py-0.2 rounded dir-ltr">
                              #{matchedC.code}
                            </span>
                          ) : null;
                        })()}
                      </span>

                      {req.note && (
                        <span className="text-stone-400 italic">({req.note})</span>
                      )}
                    </div>

                    <div className="text-[10px] text-stone-400 mt-1 font-mono flex items-center gap-2">
                      <span>📅 {formatDate(req.date)}</span>
                      {req.createdByName && <span>| تۆمارکار: {req.createdByName}</span>}
                    </div>
                  </div>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => handleOpenEditModal(req)}
                    className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"
                    title="دەستکاری"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(req.id)}
                    className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                    title="سڕینەوە"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Daily Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4">
            <h3 className="text-lg font-black text-stone-900 font-display">
              {editingRequest ? "دەستکاریکردنی داواکاری" : "تۆمارکردنی داواکاری ڕۆژانەی نوێ"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              
              {/* Request Name with Autocomplete */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">ناوی داواکاری / کاڵا:</label>
                <AutocompleteInput
                  value={requestName}
                  onChange={setRequestName}
                  savedItems={savedItems}
                  placeholder="وەک: مریشک، کارەبایی، گۆشت..."
                  required
                  onSaveNewItem={onSaveNewSavedItem}
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">بڕ / عەدەد:</label>
                <input
                  type="text"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="وەک: ٥ دانە، ٪١٠، ٢ کیڵۆ..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Customer Selection */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">کڕیار:</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">-- هەڵبژاردنی کڕیار لە لیست --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `[ژمارە: #${c.code}]` : ""} ({c.phone || "بێ ژمارە"})
                    </option>
                  ))}
                </select>
              </div>

              {!selectedCustomerId && (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">یان ناوی کڕیار بنووسە:</label>
                  <input
                    type="text"
                    value={customCustomerName}
                    onChange={(e) => setCustomCustomerName(e.target.value)}
                    placeholder="ناوی کڕیاری دەرەکی..."
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              )}

              {/* Date & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">بەروار:</label>
                  <input
                    type="date"
                    value={reqDate}
                    onChange={(e) => setReqDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">بارودۆخ:</label>
                  <select
                    value={reqStatus}
                    onChange={(e) => setReqStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="pending">⏳ چاوەڕوانکراو</option>
                    <option value="completed">✅ تەواوکراوە</option>
                  </select>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">تێبینی:</label>
                <input
                  type="text"
                  value={reqNote}
                  onChange={(e) => setReqNote(e.target.value)}
                  placeholder="زانیاری زیاتر..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition"
                >
                  پاشگەزبوونەوە
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition"
                >
                  حفظکردن
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Voice Mode Modal for Daily Requests */}
      <VoiceModeModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        sectionTitle="داواکاری ڕۆژانە"
        customers={customers}
        onApplyVoiceInput={({
          transcript,
          matchedCustomer,
          customerNotFound,
          spokenCustomerQuery,
        }) => {
          if (customerNotFound) {
            // Do NOT save data if customer requested by voice is not in database
            alert(`⚠️ کڕیارێک بە ناوی (${spokenCustomerQuery || "دەنگەکە"}) لە داتابەیسدا نەدۆزرایەوە!\nهیچ داواکارییەک بۆ کڕیاری نەناسراو ساڤ نەکرا.`);
            if (transcript) setSearchQuery(transcript);
            return;
          }

          if (matchedCustomer) {
            // Automatically select matched customer for request
            setSelectedCustomerId(matchedCustomer.id);
            setCustomCustomerName(matchedCustomer.name);
            setIsModalOpen(true);
            if (transcript) {
              setRequestName(transcript);
            }
          } else if (transcript) {
            if (isModalOpen) {
              setRequestName(transcript);
            } else {
              setSearchQuery(transcript);
            }
          }
        }}
        initialPrompt="ناوی کاڵا، ناوی کڕیار، یان داواکاری ڕۆژانە بە دەنگ بڵێ..."
      />

    </div>
  );
};

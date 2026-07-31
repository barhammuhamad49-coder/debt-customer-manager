import * as XLSX from "xlsx";
import { Customer, Transaction } from "../types";
import { calculateCustomerBalance, formatMoney } from "./storage";

// Export Customer List to Excel
export function exportCustomersToExcel(customers: Customer[], transactions: Transaction[]) {
  const data = customers.map((c, index) => {
    const balance = calculateCustomerBalance(c.id, transactions);
    return {
      "#": index + 1,
      "ناوی کڕیار": c.name,
      "ژمارەی مۆبایل": c.phone || "-",
      "ناونیشان": c.address || "-",
      "کۆی گشتی قەرز (د.ع)": balance,
      "بارودۆخ": balance > 0 ? "قەرزار" : "پاکتاوکراو",
      "بەرواری تۆمار": c.createdAt ? c.createdAt.slice(0, 10) : "-",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "کڕیاران");

  XLSX.writeFile(workbook, `کڕیاران_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// Export Transactions List to Excel
export function exportTransactionsToExcel(transactions: Transaction[], customers: Customer[]) {
  const customerMap = new Map(customers.map((c) => [c.id, c.name]));

  const data = transactions.map((t, index) => {
    let typeName = "دانەوەی پارە";
    if (t.type === "general_debt" || t.type === "debt") typeName = "قەرزی گشتی";
    if (t.type === "daily_debt") typeName = "قەرزی کاتی";
    if (t.type === "daily_receivable") typeName = "داواکاری ڕۆژانە";

    return {
      "#": index + 1,
      "بەروار": t.date,
      "ناوی کڕیار": customerMap.get(t.customerId) || "نادیار",
      "جۆری مامەڵە": typeName,
      "بڕی پارە (د.ع)": t.amount,
      "وەسف / تێبینی": t.note || "-",
      "تۆمارکار": t.createdByName || "-",
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "مامەڵەکان");

  XLSX.writeFile(workbook, `مامەڵەکان_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// Export Period Report to Excel
export function exportReportToExcel(
  periodName: string,
  totals: { generalDebt: number; dailyDebt: number; dailyReceivable: number; totalPayments: number },
  periodTx: Transaction[],
  customers: Customer[]
) {
  const customerMap = new Map(customers.map((c) => [c.id, c.name]));

  const summary = [
    { "پێوەر": "جۆری ڕاپۆرت", "بڕ (د.ع)": periodName },
    { "پێوەر": "کۆی قەرزی گشتی", "بڕ (د.ع)": totals.generalDebt },
    { "پێوەر": "کۆی قەرزی کاتی", "بڕ (د.ع)": totals.dailyDebt },
    { "پێوەر": "کۆی داواکاری ڕۆژانە", "بڕ (د.ع)": totals.dailyReceivable },
    { "پێوەر": "کۆی وەرگیراو (دانەوە)", "بڕ (د.ع)": totals.totalPayments },
    { "پێوەر": "کۆی باقی نێوان قەرز و دانەوە", "بڕ (د.ع)": (totals.generalDebt + totals.dailyDebt + totals.dailyReceivable) - totals.totalPayments },
  ];

  const details = periodTx.map((t, idx) => {
    let typeName = "دانەوەی پارە";
    if (t.type === "general_debt" || t.type === "debt") typeName = "قەرزی گشتی";
    if (t.type === "daily_debt") typeName = "قەرزی کاتی";
    if (t.type === "daily_receivable") typeName = "داواکاری ڕۆژانە";

    return {
      "#": idx + 1,
      "بەروار": t.date,
      "ناوی کڕیار": customerMap.get(t.customerId) || "نادیار",
      "جۆری مامەڵە": typeName,
      "بڕی پارە (د.ع)": t.amount,
      "تێبینی": t.note || "-",
    };
  });

  const workbook = XLSX.utils.book_new();
  const summaryWs = XLSX.utils.json_to_sheet(summary);
  const detailsWs = XLSX.utils.json_to_sheet(details);

  XLSX.utils.book_append_sheet(workbook, summaryWs, "کورته‌ی ڕاپۆرت");
  XLSX.utils.book_append_sheet(workbook, detailsWs, "وردەکاری مامەڵەکان");

  XLSX.writeFile(workbook, `ڕاپۆرت_${periodName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

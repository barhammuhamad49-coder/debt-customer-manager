import * as XLSX from "xlsx";
import { Customer, Transaction } from "../types";
import { calculateCustomerBalance, formatDate, formatMoney, getTransactionTypeLabel, todayISO, getOverdueInfo } from "./storage";

export type DateFilterType = "all" | "today" | "this_week" | "this_month" | "custom";

export interface ExportFilterOptions {
  dateFilter: DateFilterType;
  startDate?: string;
  endDate?: string;
  customerId?: string | "all";
  sectionType?: "all" | "general_debt" | "daily_debt" | "daily_request";
  userFilter?: string | "all";
  transactionType?: string | "all";
}

export interface ExportRow {
  index: number;
  customerName: string;
  phone: string;
  date: string;
  typeLabel: string;
  amount: number;
  runningBalance: number;
  note: string;
  statusLabel: string;
}

/**
 * Filter transactions based on date, customer, user, type and section rules
 */
export function filterTransactionsForExport(
  transactions: Transaction[],
  customers: Customer[],
  options: ExportFilterOptions
): { filteredTxs: Transaction[]; targetCustomer: Customer | null } {
  const today = new Date();
  const todayStr = todayISO();

  let targetCustomer: Customer | null = null;
  if (options.customerId && options.customerId !== "all") {
    targetCustomer = customers.find((c) => c.id === options.customerId) || null;
  }

  const filteredTxs = transactions.filter((tx) => {
    // 1. Customer Filter
    if (options.customerId && options.customerId !== "all" && tx.customerId !== options.customerId) {
      return false;
    }

    // 2. User Filter
    if (options.userFilter && options.userFilter !== "all") {
      if (tx.createdByUserId !== options.userFilter && tx.createdByName !== options.userFilter) {
        return false;
      }
    }

    // 3. Transaction Type Filter
    if (options.transactionType && options.transactionType !== "all") {
      if (options.transactionType === "payment") {
        if (tx.type !== "payment") return false;
      } else if (options.transactionType === "general_debt") {
        if (tx.type !== "general_debt" && tx.type !== "debt") return false;
      } else if (options.transactionType === "daily_debt") {
        if (tx.type !== "daily_debt") return false;
      }
    }

    // 4. Section Filter
    if (options.sectionType && options.sectionType !== "all") {
      if (options.sectionType === "general_debt") {
        if (tx.type !== "general_debt" && tx.type !== "debt" && tx.type !== "payment") return false;
      } else if (options.sectionType === "daily_debt") {
        if (tx.type !== "daily_debt" && (tx.type !== "payment" || !tx.note?.includes("ڕۆژانە"))) return false;
      }
    }

    // 5. Date Filter
    if (!tx.date) return true;
    const txDateStr = tx.date.slice(0, 10);

    if (options.dateFilter === "today") {
      return txDateStr === todayStr;
    } else if (options.dateFilter === "this_week") {
      const txDate = new Date(txDateStr);
      const diffTime = Math.abs(today.getTime() - txDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    } else if (options.dateFilter === "this_month") {
      return txDateStr.slice(0, 7) === todayStr.slice(0, 7);
    } else if (options.dateFilter === "custom") {
      if (options.startDate && txDateStr < options.startDate) return false;
      if (options.endDate && txDateStr > options.endDate) return false;
    }

    return true;
  });

  // Sort ascending chronologically by date and time for ledger calculation
  filteredTxs.sort((a, b) => {
    const timeA = a.date ? new Date(a.date).getTime() : 0;
    const timeB = b.date ? new Date(b.date).getTime() : 0;
    if (timeA !== timeB) return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
    const tA = (a as any).time || "";
    const tB = (b as any).time || "";
    return tA.localeCompare(tB);
  });

  return { filteredTxs, targetCustomer };
}

/**
 * Build flat export rows with running balance
 */
export function prepareExportRows(
  filteredTxs: Transaction[],
  customers: Customer[]
): ExportRow[] {
  const customerMap = new Map<string, Customer>();
  customers.forEach((c) => customerMap.set(c.id, c));

  let runningBalance = 0;

  return filteredTxs.map((tx, idx) => {
    const cust = customerMap.get(tx.customerId);
    const isPayment = tx.type === "payment";

    if (isPayment) {
      runningBalance -= tx.amount;
    } else {
      runningBalance += tx.amount;
    }

    let status = "ئاسایی";
    if (isPayment) {
      status = "وەسڵکراو 💵";
    } else if (runningBalance <= 0) {
      status = "پاکتاوکراو ✅";
    } else {
      status = "قەرزدار 🔴";
    }

    return {
      index: idx + 1,
      customerName: cust?.name || "نادیار",
      phone: cust?.phone || "—",
      date: formatDate(tx.date),
      typeLabel: getTransactionTypeLabel(tx.type),
      amount: tx.amount,
      runningBalance,
      note: tx.note || "—",
      statusLabel: status,
    };
  });
}

/**
 * Generate Excel File (.xlsx)
 */
export function exportToExcel(
  title: string,
  rows: ExportRow[],
  filename: string,
  summary: { totalDebt: number; totalPayments: number; netBalance: number }
) {
  // Convert rows to excel format with Kurdish Headers
  const excelData = rows.map((r) => ({
    "ژمارە": r.index,
    "ناوی کڕیار": r.customerName,
    "ژمارەی تەلەفۆن": r.phone,
    "بەروار": r.date,
    "جۆری مامەڵە": r.typeLabel,
    "بڕی پارە (د.ع)": r.amount,
    "پاشماوەی قەرز (د.ع)": r.runningBalance,
    "تێبینی / کاڵا": r.note,
    "دۆخی قەرز": r.statusLabel,
  }));

  // Add Summary Rows at top or bottom
  const summaryHeader = [
    { "ژمارە": "پوختەی ڕاپۆرت:", "ناوی کڕیار": title },
    { "ژمارە": "کۆی قەرز:", "ناوی کڕیار": formatMoney(summary.totalDebt) },
    { "ژمارە": "کۆی وەرگیراو:", "ناوی کڕیار": formatMoney(summary.totalPayments) },
    { "ژمارە": "کۆی پاشماوە:", "ناوی کڕیار": formatMoney(summary.netBalance) },
    {}, // empty row separator
  ];

  const worksheet = XLSX.utils.json_to_sheet([...summaryHeader, ...excelData]);

  // Set Right to Left format for Kurdish XLSX
  if (!worksheet["!views"]) worksheet["!views"] = [];
  worksheet["!views"].push({ RTL: true });

  // Auto-width for columns
  worksheet["!cols"] = [
    { wch: 8 },  // Index
    { wch: 22 }, // Customer
    { wch: 16 }, // Phone
    { wch: 18 }, // Date
    { wch: 18 }, // Type
    { wch: 16 }, // Amount
    { wch: 18 }, // Balance
    { wch: 30 }, // Note
    { wch: 16 }, // Status
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "ڕاپۆرتی_قەرزەکان");

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Generate Multi-Customer PDF Report with dedicated page per debtor, Table of Contents, and Overall Statistics
 */
export function printMultiCustomerPdfReport(
  title: string,
  subtitle: string,
  customers: Customer[],
  transactions: Transaction[],
  options: ExportFilterOptions,
  storeName: string = "دەفتەری دیجیتالی دووکان"
) {
  // 1. Get filtered transactions for all options
  const { filteredTxs } = filterTransactionsForExport(transactions, customers, {
    ...options,
    customerId: "all",
  });

  if (filteredTxs.length === 0) {
    alert("هیچ مامەڵەیەک یان قەرزدارێک نەدۆزرایەوە بۆ بەروار و فلتەرە دیاریکراوەکان.");
    return;
  }

  // 2. Group transactions by customer
  const customerMap = new Map<string, Customer>();
  customers.forEach((c) => customerMap.set(c.id, c));

  const txsByCustomer = new Map<string, Transaction[]>();
  filteredTxs.forEach((tx) => {
    const list = txsByCustomer.get(tx.customerId) || [];
    list.push(tx);
    txsByCustomer.set(tx.customerId, list);
  });

  // Get active customer IDs sorted by customer name or net debt
  const activeCustomerIds = Array.from(txsByCustomer.keys());

  const printWindow = window.open("", "_blank", "width=980,height=1000");
  if (!printWindow) {
    alert("تکایە رێگە بدە بە پەنجەرەی Pop-up بۆ کردنەوەی ڕاپۆرت");
    return;
  }

  const now = new Date();
  const todayStr = formatDate(todayISO());
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const nowFullStr = `${todayStr} (کاتژمێر ${timeStr})`;

  // Total pages calculation: 1 (Table of Contents) + N (Debtors) + 1 (Overall Stats)
  const totalPages = activeCustomerIds.length + 2;

  // Compute Grand Overall Stats
  let grandTotalDebt = 0;
  let grandTotalPayments = 0;
  let grandTotalTxCount = filteredTxs.length;
  let activeDebtorsCount = 0;
  let settledDebtorsCount = 0;

  let earliestDate = "";
  let latestDate = "";

  // Prepare data for each debtor
  const debtorsData = activeCustomerIds.map((custId, index) => {
    const customer = customerMap.get(custId) || { id: custId, name: "کڕیاری نادیار", phone: "—" };
    const custTxs = txsByCustomer.get(custId) || [];
    custTxs.sort((a, b) => (a.date > b.date ? 1 : -1));

    let custDebt = 0;
    let custPayments = 0;

    custTxs.forEach((t) => {
      if (t.type === "payment") {
        custPayments += t.amount;
      } else {
        custDebt += t.amount;
      }

      const txD = t.date ? t.date.slice(0, 10) : "";
      if (txD) {
        if (!earliestDate || txD < earliestDate) earliestDate = txD;
        if (!latestDate || txD > latestDate) latestDate = txD;
      }
    });

    const custNet = custDebt - custPayments;
    grandTotalDebt += custDebt;
    grandTotalPayments += custPayments;

    if (custNet > 0) {
      activeDebtorsCount++;
    } else {
      settledDebtorsCount++;
    }

    const custRows = prepareExportRows(custTxs, customers);
    const pageNumber = index + 2; // Page 1 is TOC

    return {
      customer,
      custTxs,
      custRows,
      custDebt,
      custPayments,
      custNet,
      pageNumber,
      txCount: custTxs.length,
    };
  });

  const grandNetBalance = grandTotalDebt - grandTotalPayments;

  // --- HTML GENERATION ---

  // 1. TABLE OF CONTENTS PAGE (فهرست)
  const tocRowsHtml = debtorsData
    .map(
      (d, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td><strong>👤 ${d.customer.name}</strong></td>
        <td style="direction: ltr; text-align: right;">${d.customer.phone || "—"}</td>
        <td style="text-align: center;">${d.txCount} مامەڵە</td>
        <td class="amount-num text-red">${formatMoney(d.custDebt)}</td>
        <td class="amount-num text-green">${formatMoney(d.custPayments)}</td>
        <td class="amount-num font-extrabold" style="color: ${d.custNet > 0 ? '#dc2626' : '#16a34a'}">
          ${formatMoney(d.custNet)}
        </td>
        <td style="text-align: center;">
          <span class="badge ${d.custNet > 0 ? "badge-debt" : "badge-payment"}">
            ${d.custNet > 0 ? "قەرزدار 🔴" : "پاکتاوکراو ✅"}
          </span>
        </td>
        <td style="text-align: center; font-weight: 800; color: #0284c7;">
          پەڕەی ${d.pageNumber}
        </td>
      </tr>
    `
    )
    .join("");

  const tocPageHtml = `
    <div class="pdf-page">
      <div>
        <div class="page-header">
          <div>
            <div class="brand-title">🏢 ${storeName}</div>
            <div class="shop-owner-info-box" style="margin-top: 6px; margin-bottom: 6px; padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11px; line-height: 1.5; color: #1e293b; display: inline-block;">
              <div style="display: flex; gap: 20px;">
                <div>
                  <div style="font-weight: 700; color: #64748b; font-size: 10px;">خاوەنی دووکان:</div>
                  <div style="font-weight: 800; color: #0f172a; font-size: 12px;">مەریوان</div>
                  <div style="direction: ltr; font-weight: 700; color: #0369a1; font-size: 11px;">📞 07501335304</div>
                </div>
                <div style="border-right: 1px solid #cbd5e1; padding-right: 20px;">
                  <div style="font-weight: 700; color: #64748b; font-size: 10px;">بەکارهێنەر:</div>
                  <div style="font-weight: 800; color: #0f172a; font-size: 12px;">بەرهەم</div>
                  <div style="direction: ltr; font-weight: 700; color: #0369a1; font-size: 11px;">📞 07508415775</div>
                </div>
              </div>
            </div>
            <div class="report-title">📚 فهرست و ناوەرۆکی گشتی ڕاپۆرتی قەرزەکان</div>
            <div class="report-subtitle">${subtitle} - جۆری فایل: PDF بەشداربووان (پەڕەی سەربەخۆ)</div>
          </div>
          <div class="meta-info">
            <div><strong>بەرواری دروستکردن:</strong> ${nowFullStr}</div>
            <div><strong>پەڕە:</strong> پەڕەی ١ لە ${totalPages}</div>
          </div>
        </div>

        <!-- Quick Grand Summary Bar -->
        <div class="summary-cards" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 20px;">
          <div class="card">
            <div class="card-label">ژمارەی قەرزداران</div>
            <div class="card-value card-dark">${debtorsData.length} کڕیار</div>
          </div>
          <div class="card">
            <div class="card-label">کۆی مامەڵەکان</div>
            <div class="card-value card-dark">${grandTotalTxCount} مامەڵە</div>
          </div>
          <div class="card">
            <div class="card-label">کۆی گشتی قەرزەکان</div>
            <div class="card-value card-red">${formatMoney(grandTotalDebt)}</div>
          </div>
          <div class="card card-main">
            <div class="card-label">کۆی صافی باقی قەرزەکان</div>
            <div class="card-value card-dark">${formatMoney(grandNetBalance)}</div>
          </div>
        </div>

        <h3 class="section-heading">📖 لیستی بەشداربووان و خشتەی دەستپێك (فهرست)</h3>

        <table>
          <thead>
            <tr>
              <th style="width: 35px">#</th>
              <th>ناوی قەرزدار</th>
              <th style="width: 110px">ژمارەی مۆبایل</th>
              <th style="width: 80px">مامەڵەکان</th>
              <th style="width: 100px">کۆی قەرز</th>
              <th style="width: 100px">کۆی وەرگیراو</th>
              <th style="width: 110px">صافی باقی</th>
              <th style="width: 90px">دۆخ</th>
              <th style="width: 70px">پەڕە</th>
            </tr>
          </thead>
          <tbody>
            ${tocRowsHtml}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <div>چاپکراوە لە ڕێگەی دەفتەری دیجیتالی دووکان | فایلی فەرمی ئەرشیفکردن</div>
        <div>پەڕەی ١ لە ${totalPages} | ${nowFullStr}</div>
      </div>
    </div>
  `;

  // 2. INDIVIDUAL DEBTOR PAGES (پەڕەی تایبەتی هەر قەرزدارێک)
  const debtorPagesHtml = debtorsData
    .map((d) => {
      const rowsHtml = d.custTxs
        .map((tx, idx) => {
          const isPayment = tx.type === "payment";
          const rowInfo = d.custRows[idx];

          // Format Date and Time
          let dateFormatted = formatDate(tx.date ? tx.date.slice(0, 10) : "");
          let timeFormatted = "—";
          if ((tx as any).time) {
            timeFormatted = (tx as any).time;
          } else if (tx.date && tx.date.includes("T")) {
            timeFormatted = tx.date.split("T")[1].slice(0, 5);
          }

          const typeLabel = isPayment ? "قەرزدانەوە 💵" : "قەرز وەرگرتن 🛒";

          return `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td style="white-space: nowrap;">
                <div><strong>${dateFormatted}</strong></div>
                <div style="font-size: 10px; color: #64748b;">⏰ ${timeFormatted}</div>
              </td>
              <td>
                <span class="badge ${isPayment ? "badge-payment" : "badge-debt"}">
                  ${typeLabel}
                </span>
              </td>
              <td class="amount-num ${isPayment ? "text-green" : "text-red"}">
                ${formatMoney(tx.amount)}
              </td>
              <td class="amount-num font-extrabold" style="color: ${rowInfo ? (rowInfo.runningBalance > 0 ? "#dc2626" : "#16a34a") : "#0f172a"};">
                ${rowInfo ? formatMoney(rowInfo.runningBalance) : "—"}
              </td>
              <td>${tx.note || "—"}</td>
              <td style="text-align: center;">
                <span class="badge ${rowInfo && rowInfo.runningBalance <= 0 ? "badge-payment" : "badge-debt"}">
                  ${rowInfo ? rowInfo.statusLabel : "ئاسایی"}
                </span>
              </td>
            </tr>
          `;
        })
        .join("");

      return `
        <div class="pdf-page">
          <div>
            <!-- Page Header -->
            <div class="page-header">
              <div>
                <div class="brand-title">🏢 ${storeName}</div>
                <div class="shop-owner-info-box" style="margin-top: 6px; margin-bottom: 6px; padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11px; line-height: 1.5; color: #1e293b; display: inline-block;">
                  <div style="display: flex; gap: 20px;">
                    <div>
                      <div style="font-weight: 700; color: #64748b; font-size: 10px;">خاوەنی دووکان:</div>
                      <div style="font-weight: 800; color: #0f172a; font-size: 12px;">مەریوان</div>
                      <div style="direction: ltr; font-weight: 700; color: #0369a1; font-size: 11px;">📞 07501335304</div>
                    </div>
                    <div style="border-right: 1px solid #cbd5e1; padding-right: 20px;">
                      <div style="font-weight: 700; color: #64748b; font-size: 10px;">بەکارهێنەر:</div>
                      <div style="font-weight: 800; color: #0f172a; font-size: 12px;">بەرهەم</div>
                      <div style="direction: ltr; font-weight: 700; color: #0369a1; font-size: 11px;">📞 07508415775</div>
                    </div>
                  </div>
                </div>
                <div class="report-title">📊 ڕاپۆرتی حیسابی تایبەت بە کڕیار</div>
                <div class="report-subtitle">${title} - ${subtitle}</div>
              </div>
              <div class="meta-info">
                <div><strong>بەرواری چاپ:</strong> ${nowFullStr}</div>
                <div><strong>پەڕە:</strong> پەڕەی ${d.pageNumber} لە ${totalPages}</div>
              </div>
            </div>

            <!-- Customer Identity Banner -->
            <div class="customer-card">
              <div class="customer-info">
                <div class="customer-name">👤 ${d.customer.name}</div>
                <div class="customer-phone">📞 ${d.customer.phone || "ژمارەی مۆبایل دیاری نەکراوە"}</div>
              </div>
              <div class="customer-badge ${d.custNet > 0 ? "badge-red" : "badge-green"}">
                ${d.custNet > 0 ? "قەرزدار 🔴" : "پاکتاوکراو ✅"}
              </div>
            </div>

            <!-- Summary Metrics Cards -->
            <div class="summary-cards">
              <div class="card">
                <div class="card-label">کۆی قەرز (وەگرتنی قەرز)</div>
                <div class="card-value card-red">${formatMoney(d.custDebt)}</div>
              </div>
              <div class="card">
                <div class="card-label">کۆی پارەی وەرگیراو (گەڕاوەتەوە)</div>
                <div class="card-value card-green">${formatMoney(d.custPayments)}</div>
              </div>
              <div class="card card-main">
                <div class="card-label">ماوەی قەرزی ئێستا (باقی)</div>
                <div class="card-value card-dark">${formatMoney(d.custNet)}</div>
              </div>
            </div>

            <h3 class="section-heading">📜 مێژووی تەواوی مامەڵەکانی کڕیار (${d.txCount} مامەڵە)</h3>

            <!-- Transactions Ledger Table -->
            <table>
              <thead>
                <tr>
                  <th style="width: 35px">#</th>
                  <th style="width: 110px">بەروار و کات</th>
                  <th style="width: 110px">جۆری مامەڵە</th>
                  <th style="width: 110px">بڕی پارە</th>
                  <th style="width: 110px">پاشماوە (باقی)</th>
                  <th>تێبینی / کاڵا</th>
                  <th style="width: 90px">دۆخ</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div>چاپکراوە لە ڕێگەی دەفتەری قەرزی دووکان | کڕیار: ${d.customer.name}</div>
            <div>پەڕەی ${d.pageNumber} لە ${totalPages} | ${nowFullStr}</div>
          </div>
        </div>
      `;
    })
    .join("");

  // 3. OVERALL STATISTICS & ARCHIVE END PAGE (ئاماری گشتی)
  const overallStatsPageHtml = `
    <div class="pdf-page">
      <div>
        <div class="page-header">
          <div>
            <div class="brand-title">🏢 ${storeName}</div>
            <div class="shop-owner-info-box" style="margin-top: 6px; margin-bottom: 6px; padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11px; line-height: 1.5; color: #1e293b; display: inline-block;">
              <div style="display: flex; gap: 20px;">
                <div>
                  <div style="font-weight: 700; color: #64748b; font-size: 10px;">خاوەنی دووکان:</div>
                  <div style="font-weight: 800; color: #0f172a; font-size: 12px;">مەریوان</div>
                  <div style="direction: ltr; font-weight: 700; color: #0369a1; font-size: 11px;">📞 07501335304</div>
                </div>
                <div style="border-right: 1px solid #cbd5e1; padding-right: 20px;">
                  <div style="font-weight: 700; color: #64748b; font-size: 10px;">بەکارهێنەر:</div>
                  <div style="font-weight: 800; color: #0f172a; font-size: 12px;">بەرهەم</div>
                  <div style="direction: ltr; font-weight: 700; color: #0369a1; font-size: 11px;">📞 07508415775</div>
                </div>
              </div>
            </div>
            <div class="report-title">📈 ئاماری گشتی و بەڵگەنامەی کۆتایی ڕاپۆرت</div>
            <div class="report-subtitle">پوختەی زانیارییەکان و شیکاری گشتی قەرزەکانی دووکان</div>
          </div>
          <div class="meta-info">
            <div><strong>بەرواری دروستکردن:</strong> ${nowFullStr}</div>
            <div><strong>پەڕە:</strong> پەڕەی ${totalPages} لە ${totalPages}</div>
          </div>
        </div>

        <!-- Metric Grid -->
        <div class="summary-cards" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 24px;">
          <div class="card">
            <div class="card-label">👥 ژمارەی هەموو قەرزداران</div>
            <div class="card-value card-dark">${activeCustomerIds.length} کڕیار</div>
          </div>
          <div class="card">
            <div class="card-label">📝 کۆی هەموو مامەڵەکان</div>
            <div class="card-value card-dark">${grandTotalTxCount} مامەڵە</div>
          </div>
          <div class="card">
            <div class="card-label">🔴 کڕیارانی بەپێوە (قەرزدار)</div>
            <div class="card-value card-red">${activeDebtorsCount} کڕیار</div>
          </div>
          <div class="card">
            <div class="card-label">🛒 کۆی گشتی قەرزەکان</div>
            <div class="card-value card-red">${formatMoney(grandTotalDebt)}</div>
          </div>
          <div class="card">
            <div class="card-label">💵 کۆی گشتی پارەی وەرگیراو</div>
            <div class="card-value card-green">${formatMoney(grandTotalPayments)}</div>
          </div>
          <div class="card card-main">
            <div class="card-label">⚖️ کۆی گشتی صافی باقی قەرز</div>
            <div class="card-value card-dark">${formatMoney(grandNetBalance)}</div>
          </div>
        </div>

        <h3 class="section-heading">📌 زانیاری زێدەتر و ئەرشیفی ڕاپۆرت</h3>

        <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; font-size: 13px;">
            <div><strong>کۆمپانیا / دووکان:</strong> ${storeName}</div>
            <div><strong>کۆی کڕیارانی پاکتاوکراو:</strong> ${settledDebtorsCount} کڕیار</div>
            <div><strong>بەرواری یەکەم مامەڵە لەم راپۆرتە:</strong> ${earliestDate ? formatDate(earliestDate) : "—"}</div>
            <div><strong>بەرواری دوایین مامەڵە لەم راپۆرتە:</strong> ${latestDate ? formatDate(latestDate) : "—"}</div>
            <div><strong>ژمارەی گشتی پەڕەکان:</strong> ${totalPages} پەڕەی A4</div>
            <div><strong>بارودۆخی فایل:</strong> دروستکراو بۆ چاپ و ئەرشیف</div>
          </div>
        </div>

        <!-- Signature Box -->
        <div style="margin-top: 40px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px; text-align: center;">
          <div style="border: 1.5px dashed #94a3b8; border-radius: 16px; padding: 24px;">
            <div style="font-weight: 800; color: #0f172a; margin-bottom: 40px;">ئیمزا و مۆری خاوەن دووکان / بەڕێوەبەر</div>
            <div style="font-size: 11px; color: #64748b;">بەروار: ..... / ..... / ...........</div>
          </div>
          <div style="border: 1.5px dashed #94a3b8; border-radius: 16px; padding: 24px;">
            <div style="font-weight: 800; color: #0f172a; margin-bottom: 40px;">پەسەندکردن و وردبینیکەر</div>
            <div style="font-size: 11px; color: #64748b;">بەروار: ..... / ..... / ...........</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <div>چاپکراوە لە ڕێگەی دەفتەری دیجیتالی دووکان | بەڵگەنامەی کۆتایی ئەرشیف</div>
        <div>پەڕەی ${totalPages} لە ${totalPages} | ${nowFullStr}</div>
      </div>
    </div>
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ckb">
    <head>
      <meta charset="UTF-8">
      <title>${title} - ڕاپۆرتی گشتی قەرزداران (${todayStr})</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700;800;900&display=swap');
        
        * {
          box-sizing: border-box;
          font-family: 'Vazirmatn', system-ui, -apple-system, sans-serif;
        }

        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          color: #1c1917;
          direction: rtl;
          font-size: 12.5px;
        }

        .pdf-page {
          padding: 28px;
          box-sizing: border-box;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          page-break-after: always;
          break-after: page;
          page-break-inside: avoid;
          border-bottom: 2px dashed #cbd5e1;
        }

        .pdf-page:last-child {
          page-break-after: auto;
          break-after: auto;
          border-bottom: none;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
          border-bottom: 2px solid #0f172a;
          margin-bottom: 16px;
        }

        .brand-title {
          font-size: 19px;
          font-weight: 900;
          color: #0f172a;
        }

        .report-title {
          font-size: 14px;
          font-weight: 800;
          color: #0369a1;
          margin-top: 2px;
        }

        .report-subtitle {
          font-size: 11px;
          color: #64748b;
          margin-top: 2px;
        }

        .meta-info {
          text-align: left;
          font-size: 11px;
          color: #475569;
          font-weight: 600;
          line-height: 1.5;
        }

        .section-heading {
          font-size: 13.5px;
          font-weight: 800;
          color: #0f172a;
          margin: 16px 0 10px 0;
          border-right: 4px solid #0284c7;
          padding-right: 8px;
        }

        .customer-card {
          background: #f8fafc;
          border: 1.5px solid #cbd5e1;
          border-radius: 14px;
          padding: 12px 16px;
          margin-bottom: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .customer-name {
          font-size: 17px;
          font-weight: 900;
          color: #0f172a;
        }

        .customer-phone {
          font-size: 12.5px;
          font-weight: 700;
          color: #475569;
          direction: ltr;
          margin-top: 2px;
        }

        .customer-badge {
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
        }

        .badge-red { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
        .badge-green { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }

        .card {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 10px 12px;
          text-align: center;
        }

        .card-main {
          background: #f0f9ff;
          border-color: #7dd3fc;
        }

        .card-label {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
        }

        .card-value {
          font-size: 15px;
          font-weight: 900;
          margin-top: 2px;
          direction: ltr;
          text-align: center;
        }

        .card-red { color: #dc2626; }
        .card-green { color: #16a34a; }
        .card-dark { color: #0f172a; }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 6px;
        }

        th {
          background-color: #0f172a;
          color: #ffffff;
          font-weight: 800;
          text-align: right;
          padding: 8px 10px;
          font-size: 11.5px;
        }

        td {
          padding: 8px 10px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 11.5px;
        }

        tr:nth-child(even) {
          background-color: #f8fafc;
        }

        .amount-num {
          font-family: monospace;
          font-weight: 800;
          direction: ltr;
          text-align: right;
        }

        .text-red { color: #dc2626; }
        .text-green { color: #16a34a; }

        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 700;
        }

        .badge-payment { background: #dcfce7; color: #15803d; }
        .badge-debt { background: #fee2e2; color: #b91c1c; }

        .footer {
          margin-top: auto;
          padding-top: 12px;
          border-top: 1.5px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          font-size: 10.5px;
          color: #64748b;
          font-weight: 600;
        }

        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
          @page { size: A4 portrait; margin: 8mm; }
          .pdf-page {
            border-bottom: none;
            padding: 0;
            min-height: 100vh;
            page-break-after: always;
            break-after: page;
          }
          .pdf-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      </style>
    </head>
    <body>
      ${tocPageHtml}
      ${debtorPagesHtml}
      ${overallStatsPageHtml}

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 400);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * Generate PDF / Print-Ready view in printable popup window
 */
export function printOrPdfReport(
  title: string,
  subtitle: string,
  rows: ExportRow[],
  summary: { totalDebt: number; totalPayments: number; netBalance: number },
  storeName: string = "دەفتەری دیجیتالی دووکان"
) {
  const printWindow = window.open("", "_blank", "width=900,height=1000");
  if (!printWindow) {
    alert("تکایە رێگە بدە بپ پەنجەرەی Pop-up بۆ کردنەوەی ڕاپۆرت");
    return;
  }

  const todayStr = formatDate(todayISO());

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ckb">
    <head>
      <meta charset="UTF-8">
      <title>${title} - ${todayStr}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;800;900&display=swap');
        
        * {
          box-sizing: border-box;
          font-family: 'Vazirmatn', system-ui, -apple-system, sans-serif;
        }

        body {
          margin: 0;
          padding: 24px;
          background: #ffffff;
          color: #1c1917;
          direction: rtl;
          font-size: 13px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 16px;
          border-bottom: 2px solid #e7e5e4;
          margin-bottom: 20px;
        }

        .brand-title {
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
        }

        .report-title {
          font-size: 16px;
          font-weight: 800;
          color: #0369a1;
          margin-top: 4px;
        }

        .report-subtitle {
          font-size: 12px;
          color: #57534e;
          margin-top: 2px;
        }

        .meta-info {
          text-align: left;
          font-size: 12px;
          color: #44403c;
        }

        .summary-cards {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .card {
          flex: 1;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 12px 16px;
        }

        .card-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
        }

        .card-value {
          font-size: 16px;
          font-weight: 900;
          margin-top: 4px;
          direction: ltr;
          text-align: right;
        }

        .card-red { color: #dc2626; }
        .card-green { color: #16a34a; }
        .card-dark { color: #0f172a; }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }

        th {
          background-color: #0f172a;
          color: #ffffff;
          font-weight: 800;
          text-align: right;
          padding: 10px 12px;
          font-size: 12px;
        }

        td {
          padding: 10px 12px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 12px;
        }

        tr:nth-child(even) {
          background-color: #f8fafc;
        }

        .amount-num {
          font-family: monospace;
          font-weight: 800;
          direction: ltr;
          text-align: right;
        }

        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }

        .badge-payment { background: #dcfce7; color: #15803d; }
        .badge-debt { background: #fee2e2; color: #b91c1c; }

        .footer {
          margin-top: 30px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #78716c;
        }

        @media print {
          body { padding: 0; }
          .no-print { display: none; }
          @page { size: A4; margin: 12mm; }
        }
      </style>
    </head>
    <body>

      <div class="header">
        <div>
          <div class="brand-title">🏢 ${storeName}</div>
          <div class="shop-owner-info-box" style="margin-top: 6px; margin-bottom: 6px; padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11px; line-height: 1.5; color: #1e293b; display: inline-block;">
            <div style="display: flex; gap: 20px;">
              <div>
                <div style="font-weight: 700; color: #64748b; font-size: 10px;">خاوەنی دووکان:</div>
                <div style="font-weight: 800; color: #0f172a; font-size: 12px;">مەریوان</div>
                <div style="direction: ltr; font-weight: 700; color: #0369a1; font-size: 11px;">📞 07501335304</div>
              </div>
              <div style="border-right: 1px solid #cbd5e1; padding-right: 20px;">
                <div style="font-weight: 700; color: #64748b; font-size: 10px;">بەکارهێنەر:</div>
                <div style="font-weight: 800; color: #0f172a; font-size: 12px;">بەرهەم</div>
                <div style="direction: ltr; font-weight: 700; color: #0369a1; font-size: 11px;">📞 07508415775</div>
              </div>
            </div>
          </div>
          <div class="report-title">📊 ${title}</div>
          <div class="report-subtitle">${subtitle}</div>
        </div>
        <div class="meta-info">
          <div><strong>بەرواری دروستکردن:</strong> ${todayStr}</div>
          <div><strong>ژمارەی تۆمارەکان:</strong> ${rows.length} تۆمار</div>
        </div>
      </div>

      <div class="summary-cards">
        <div class="card">
          <div class="card-label">کۆی قەرزەکان</div>
          <div class="card-value card-red">${formatMoney(summary.totalDebt)}</div>
        </div>
        <div class="card">
          <div class="card-label">کۆی وەرگیراو (وەسڵکراو)</div>
          <div class="card-value card-green">${formatMoney(summary.totalPayments)}</div>
        </div>
        <div class="card">
          <div class="card-label">کۆی پاشماوەی مانەوە</div>
          <div class="card-value card-dark">${formatMoney(summary.netBalance)}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 40px">#</th>
            <th>ناوی کڕیار</th>
            <th>بەروار</th>
            <th>جۆری مامەڵە</th>
            <th>بڕی پارە</th>
            <th>پاشماوە</th>
            <th>تێبینی / کاڵا</th>
            <th>دۆخ</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `
            <tr>
              <td>${r.index}</td>
              <td><strong>${r.customerName}</strong><br><small style="color:#64748b">${r.phone}</small></td>
              <td>${r.date}</td>
              <td>${r.typeLabel}</td>
              <td class="amount-num">${formatMoney(r.amount)}</td>
              <td class="amount-num" style="color: ${r.runningBalance > 0 ? "#dc2626" : "#16a34a"}">
                ${formatMoney(r.runningBalance)}
              </td>
              <td>${r.note}</td>
              <td>
                <span class="badge ${r.runningBalance <= 0 ? "badge-payment" : "badge-debt"}">
                  ${r.statusLabel}
                </span>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>

      <div class="footer">
        <div>چاپکراوە لە ڕێگەی دەفتەری قەرزی دووکان</div>
        <div>لاپەڕە ١ لە ١</div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * Generate Share text summary for messaging apps
 */
export function buildShareSummaryText(
  title: string,
  customerName: string | null,
  summary: { totalDebt: number; totalPayments: number; netBalance: number },
  rowsCount: number
): string {
  const dateStr = formatDate(todayISO());

  return `📊 *ڕاپۆرتی ${title}*
📅 بەروار: ${dateStr}
${customerName ? `👤 کڕیار: ${customerName}\n` : ""}
➖➖➖➖➖➖➖➖
💰 *کۆی قەرز:* ${formatMoney(summary.totalDebt)}
💵 *کۆی وەرگیراو:* ${formatMoney(summary.totalPayments)}
📌 *پاشماوەی نەدراوە:* ${formatMoney(summary.netBalance)}
📝 *ژمارەی مامەڵەکان:* ${rowsCount}

نێردراوە لە ڕێگەی دەفتەری قەرزی دووکان 🏢`;
}

/**
 * Copy full detailed report text to clipboard
 */
export function copyReportToClipboard(
  title: string,
  customerName: string | null,
  summary: { totalDebt: number; totalPayments: number; netBalance: number },
  rows: ExportRow[]
): Promise<boolean> {
  const dateStr = formatDate(todayISO());

  let text = `📊 *${title}*\n`;
  text += `📅 بەروار: ${dateStr}\n`;
  if (customerName) text += `👤 کڕیار: ${customerName}\n`;
  text += `➖➖➖➖➖➖➖➖\n`;
  text += `💰 *کۆی قەرز:* ${formatMoney(summary.totalDebt)} د.ع\n`;
  text += `💵 *کۆی وەرگیراو:* ${formatMoney(summary.totalPayments)} د.ع\n`;
  text += `📌 *پاشماوەی باقی:* ${formatMoney(summary.netBalance)} د.ع\n`;
  text += `📝 *ژمارەی مامەڵەکان:* ${rows.length}\n`;
  text += `➖➖➖➖➖➖➖➖\n`;

  if (rows.length > 0) {
    text += `📋 *خشتەی مامەڵەکان:*\n`;
    rows.forEach((r) => {
      text += `${r.index}. [${r.date}] ${r.typeLabel}: ${r.note} - ${formatMoney(r.amount)} د.ع (پاشماوە: ${formatMoney(r.runningBalance)})\n`;
    });
    text += `➖➖➖➖➖➖➖➖\n`;
  }

  text += `🏢 دەفتەری دیجیتالی دووکان`;

  return navigator.clipboard.writeText(text).then(
    () => true,
    (err) => {
      console.error("Clipboard write error:", err);
      return false;
    }
  );
}


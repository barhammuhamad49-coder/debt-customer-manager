import { Customer, Transaction } from "../types";
import { calculateCustomerBalance, daysAgo, isDebtType, isTransactionForCustomer } from "./storage";

export type CreditRatingGrade = "A" | "B" | "C" | "D";

export interface CreditRatingResult {
  grade: CreditRatingGrade;
  title: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  textColor: string;
  iconBg: string;
  dotColor: string;
  score: number;
  metrics: {
    totalTransactions: number;
    totalDebtAmount: number;
    totalPaymentAmount: number;
    paymentRatioPercent: number;
    successfulPaymentsCount: number;
    oldestDebtDays: number;
    overdueCount: number;
    currentBalance: number;
  };
  reasons: string[];
}

export function calculateCustomerCreditRating(
  customerId: string,
  transactions: Transaction[],
  thresholdDays: number = 30,
  customerCode?: string
): CreditRatingResult {
  const customerTxs = transactions.filter((t) => isTransactionForCustomer(t, customerId, customerCode));
  const balance = calculateCustomerBalance(customerId, transactions, customerCode);

  let totalDebtAmount = 0;
  let totalPaymentAmount = 0;
  let successfulPaymentsCount = 0;
  let debtTxsCount = 0;

  const debtTxs = customerTxs.filter((t) => isDebtType(t.type));
  
  customerTxs.forEach((t) => {
    if (t.type === "payment") {
      totalPaymentAmount += t.amount;
      successfulPaymentsCount++;
    } else {
      totalDebtAmount += t.amount;
      debtTxsCount++;
    }
  });

  const paymentRatioPercent =
    totalDebtAmount > 0
      ? Math.min(100, Math.round((totalPaymentAmount / totalDebtAmount) * 100))
      : 100;

  // Calculate age of oldest debt if balance > 0
  let oldestDebtDays = 0;
  let overdueCount = 0;

  if (balance > 0 && debtTxs.length > 0) {
    const oldestDebtDate = debtTxs.reduce(
      (oldest, t) => (t.date < oldest ? t.date : oldest),
      debtTxs[0].date
    );
    oldestDebtDays = daysAgo(oldestDebtDate);

    // Count debt transactions older than threshold
    overdueCount = debtTxs.filter((t) => daysAgo(t.date) >= thresholdDays).length;
  }

  // Scoring logic (0 to 100)
  let score = 85; // default base score

  if (customerTxs.length === 0) {
    score = 90; // Fresh new customer with clean slate
  } else {
    // Payment ratio impact
    if (paymentRatioPercent >= 80) score += 10;
    else if (paymentRatioPercent < 50) score -= Math.round((50 - paymentRatioPercent) * 0.5);

    // Overdue days impact
    if (balance > 0) {
      if (oldestDebtDays <= 10) score += 5;
      else if (oldestDebtDays > 30) score -= Math.round((oldestDebtDays - 30) * 0.8);
      
      // Overdue transactions count penalty
      score -= overdueCount * 5;
    } else {
      // Settled balance bonus
      score += 10;
    }

    // Successful payments count bonus
    if (successfulPaymentsCount >= 5) score += 5;
    if (successfulPaymentsCount === 0 && balance > 0 && oldestDebtDays > 20) score -= 15;
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Determine Grade
  let grade: CreditRatingGrade = "A";

  if (balance > 0 && (oldestDebtDays >= 60 || overdueCount >= 3 || score < 45)) {
    grade = "D";
  } else if (balance > 0 && (oldestDebtDays >= 30 || paymentRatioPercent < 40 || score < 65)) {
    grade = "C";
  } else if (balance > 0 && (oldestDebtDays > 12 || paymentRatioPercent < 80 || score < 82)) {
    grade = "B";
  } else {
    grade = "A";
  }

  // Reasons & Presentation data
  const reasons: string[] = [];

  if (grade === "A") {
    if (balance <= 0) {
      reasons.push("هیچ قەرزێکی ماوەی نییە و هەموو مامەڵەکانی پاکتاو کراون.");
    } else {
      reasons.push("قەرزەکەی زۆر نوێیە و هەموو پارەدانەکانی لە کاتی خۆیدا بووە.");
    }
    if (successfulPaymentsCount > 0) {
      reasons.push(`${successfulPaymentsCount} جاری سەرکەوتووانە پارەی گەڕاندۆتەوە.`);
    }
    reasons.push(`ڕێژەی پاکتاوکردن و گەڕاندنەوەی پارە: ${paymentRatioPercent}٪`);
  } else if (grade === "B") {
    reasons.push("زۆرجار پارە دەدات، بەڵام هەندێک جار چەند ڕۆژێک دواکەوتنی کەمی هەبووە.");
    if (oldestDebtDays > 0) {
      reasons.push(`کۆتا قەرز پێش ${oldestDebtDays} ڕۆژ تۆمارکراوە.`);
    }
    reasons.push(`ڕێژەی گەڕاندنەوەی پارە: ${paymentRatioPercent}٪`);
  } else if (grade === "C") {
    reasons.push("زۆربەی جارەکان پارەدانەکەی دواکەوتووە و ڕێژەی گەڕاندنەوەی نزمە.");
    if (oldestDebtDays > 0) {
      reasons.push(`قەرزی تێپەڕبووی دواکەوتووی هەیە (${oldestDebtDays} ڕۆژ).`);
    }
    if (overdueCount > 0) {
      reasons.push(`ژمارەی مامەڵە دواکەوتووەکان: ${overdueCount} جار.`);
    }
  } else {
    // Grade D
    reasons.push("زۆر جار پارەی نەداوەتەوە و قەرزی زۆر کۆنی بەسەردا تێپەڕیوە.");
    if (oldestDebtDays > 0) {
      reasons.push(`ماوەی ${oldestDebtDays} ڕۆژە قەرزەکە نەدراوەتەوە (تێپەڕبووە).`);
    }
    reasons.push("پێویستە ئاگاداری تایبەت بکرێت پێش تۆمارکردنی هەر قەرزێکی نوێ.");
  }

  // Grade styling properties
  switch (grade) {
    case "A":
      return {
        grade: "A",
        title: "متمانەی زۆر باش",
        description: "هەمیشە پارەکەی لە کاتی خۆیدا یان زوو دەدات، هیچ دواکەوتنێکی گرنگی نییە.",
        badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200/90",
        badgeText: "text-emerald-800",
        badgeBorder: "border-emerald-300",
        textColor: "text-emerald-700",
        iconBg: "bg-emerald-500",
        dotColor: "🟢",
        score,
        metrics: {
          totalTransactions: customerTxs.length,
          totalDebtAmount,
          totalPaymentAmount,
          paymentRatioPercent,
          successfulPaymentsCount,
          oldestDebtDays,
          overdueCount,
          currentBalance: balance,
        },
        reasons,
      };

    case "B":
      return {
        grade: "B",
        title: "متمانەی باش",
        description: "زۆرجار پارە دەدات، بەڵام هەندێک جار چەند ڕۆژێک دواکەوتن هەیە.",
        badgeBg: "bg-amber-50 text-amber-900 border-amber-200/90",
        badgeText: "text-amber-900",
        badgeBorder: "border-amber-300",
        textColor: "text-amber-700",
        iconBg: "bg-amber-500",
        dotColor: "🟡",
        score,
        metrics: {
          totalTransactions: customerTxs.length,
          totalDebtAmount,
          totalPaymentAmount,
          paymentRatioPercent,
          successfulPaymentsCount,
          oldestDebtDays,
          overdueCount,
          currentBalance: balance,
        },
        reasons,
      };

    case "C":
      return {
        grade: "C",
        title: "متمانەی لاواز",
        description: "زۆربەی جارەکان پارەدانەکەی دواکەوتووە و قەرزی ماوەی درێژی هەیە.",
        badgeBg: "bg-orange-50 text-orange-900 border-orange-200/90",
        badgeText: "text-orange-900",
        badgeBorder: "border-orange-300",
        textColor: "text-orange-700",
        iconBg: "bg-orange-500",
        dotColor: "🟠",
        score,
        metrics: {
          totalTransactions: customerTxs.length,
          totalDebtAmount,
          totalPaymentAmount,
          paymentRatioPercent,
          successfulPaymentsCount,
          oldestDebtDays,
          overdueCount,
          currentBalance: balance,
        },
        reasons,
      };

    case "D":
    default:
      return {
        grade: "D",
        title: "مەترسیدار",
        description: "زۆر جار پارە نەداوەتەوە، قەرزە کۆنەکانی زۆرە و ماوەی زۆر بەسەریدا تێپەڕیوە.",
        badgeBg: "bg-rose-50 text-rose-900 border-rose-300 shadow-2xs",
        badgeText: "text-rose-900",
        badgeBorder: "border-rose-400",
        textColor: "text-rose-700",
        iconBg: "bg-rose-600",
        dotColor: "🔴",
        score,
        metrics: {
          totalTransactions: customerTxs.length,
          totalDebtAmount,
          totalPaymentAmount,
          paymentRatioPercent,
          successfulPaymentsCount,
          oldestDebtDays,
          overdueCount,
          currentBalance: balance,
        },
        reasons,
      };
  }
}

/**
 * Calculates credit rating statistics summary for all customers
 */
export function getCreditRatingSummaryStats(
  customers: Customer[],
  transactions: Transaction[],
  thresholdDays: number = 30
) {
  let countA = 0;
  let countB = 0;
  let countC = 0;
  let countD = 0;

  customers.forEach((c) => {
    const rating = calculateCustomerCreditRating(c.id, transactions, thresholdDays, c.code);
    if (rating.grade === "A") countA++;
    else if (rating.grade === "B") countB++;
    else if (rating.grade === "C") countC++;
    else if (rating.grade === "D") countD++;
  });

  return { countA, countB, countC, countD, total: customers.length };
}

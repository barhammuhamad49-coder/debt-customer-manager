import { Customer, Transaction } from "../types";
import { calculateCustomerBalance, todayISO } from "./storage";

export interface SectionDebtStat {
  totalBalance: number;       // Current remaining debt balance
  debtorsCount: number;       // Active debt-carrying customers count
  todayAdded: number;         // Debt added today
  todayPaid: number;          // Payments received today
  isHighAlert: boolean;       // High debt warning threshold reached
}

export interface DashboardOverview {
  generalDebt: SectionDebtStat;
  dailyDebt: SectionDebtStat;
  grandTotal: SectionDebtStat;
  overdueCount: number;
}

export function computeDashboardOverview(
  customers: Customer[],
  transactions: Transaction[],
  overdueThresholdDays: number = 30
): DashboardOverview {
  const todayStr = todayISO();

  // 1. Today's changes breakdown
  let generalTodayAdded = 0;
  let generalTodayPaid = 0;
  let dailyTodayAdded = 0;
  let dailyTodayPaid = 0;

  transactions.forEach((t) => {
    if (t.date === todayStr) {
      if (t.type === "general_debt" || t.type === "debt") {
        generalTodayAdded += t.amount;
      } else if (t.type === "daily_debt") {
        dailyTodayAdded += t.amount;
      } else if (t.type === "payment") {
        if (t.note && t.note.includes("ڕۆژانە")) {
          dailyTodayPaid += t.amount;
        } else {
          generalTodayPaid += t.amount;
        }
      }
    }
  });

  // 2. Customer-level balances for General Debt & Daily Debt
  let generalDebtBalanceTotal = 0;
  let generalDebtorsCount = 0;

  let dailyDebtBalanceTotal = 0;
  let dailyDebtorsCount = 0;

  let grandTotalBalance = 0;
  let grandDebtorsCount = 0;

  customers.forEach((c) => {
    const custTxs = transactions.filter((t) => t.customerId === c.id);

    // Total balance for customer across all types
    const totalBal = calculateCustomerBalance(c.id, transactions);
    if (totalBal > 0) {
      grandTotalBalance += totalBal;
      grandDebtorsCount += 1;
    }

    // General debt portion
    const genTxs = custTxs.filter(
      (t) =>
        t.type === "general_debt" ||
        t.type === "debt" ||
        (t.type === "payment" && (!t.note || !t.note.includes("ڕۆژانە")))
    );
    const genBal = genTxs.reduce((sum, t) => sum + (t.type === "payment" ? -t.amount : t.amount), 0);
    if (genBal > 0) {
      generalDebtBalanceTotal += genBal;
      generalDebtorsCount += 1;
    }

    // Daily debt portion
    const dailyTxs = custTxs.filter(
      (t) => t.type === "daily_debt" || (t.type === "payment" && t.note && t.note.includes("ڕۆژانە"))
    );
    const dailyBal = dailyTxs.reduce((sum, t) => sum + (t.type === "payment" ? -t.amount : t.amount), 0);
    if (dailyBal > 0) {
      dailyDebtBalanceTotal += dailyBal;
      dailyDebtorsCount += 1;
    }
  });

  // 3. Overdue count (older than overdueThresholdDays)
  const overdueCount = customers.filter((c) => {
    const custTx = transactions.filter((t) => t.customerId === c.id);
    if (custTx.length === 0) return false;
    const balance = custTx.reduce((sum, t) => sum + (t.type === "payment" ? -t.amount : t.amount), 0);
    if (balance <= 0) return false;
    const lastTxDate = custTx.reduce((latest, t) => (t.date > latest ? t.date : latest), custTx[0].date);
    const diffDays = Math.floor((new Date().getTime() - new Date(lastTxDate).getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= overdueThresholdDays;
  }).length;

  return {
    generalDebt: {
      totalBalance: generalDebtBalanceTotal,
      debtorsCount: generalDebtorsCount,
      todayAdded: generalTodayAdded,
      todayPaid: generalTodayPaid,
      isHighAlert: generalDebtBalanceTotal >= 1000000,
    },
    dailyDebt: {
      totalBalance: dailyDebtBalanceTotal,
      debtorsCount: dailyDebtorsCount,
      todayAdded: dailyTodayAdded,
      todayPaid: dailyTodayPaid,
      isHighAlert: dailyDebtBalanceTotal >= 500000,
    },
    grandTotal: {
      totalBalance: grandTotalBalance,
      debtorsCount: grandDebtorsCount,
      todayAdded: generalTodayAdded + dailyTodayAdded,
      todayPaid: generalTodayPaid + dailyTodayPaid,
      isHighAlert: grandTotalBalance >= 1500000,
    },
    overdueCount,
  };
}

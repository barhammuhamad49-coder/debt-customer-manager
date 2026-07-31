export interface VisitDay {
  id: string; // e.g. "sunday", "monday", ...
  name: string; // e.g. "یەکشەممە", "دووشەممە", ...
  dayIndex: number; // 0..6 (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
}

export const WEEK_DAYS: VisitDay[] = [
  { id: "sunday", name: "یەکشەممە", dayIndex: 0 },
  { id: "monday", name: "دووشەممە", dayIndex: 1 },
  { id: "tuesday", name: "سێشەممە", dayIndex: 2 },
  { id: "wednesday", name: "چوارشەممە", dayIndex: 3 },
  { id: "thursday", name: "پێنجشەممە", dayIndex: 4 },
  { id: "friday", name: "هەینی", dayIndex: 5 },
  { id: "saturday", name: "شەممە", dayIndex: 6 },
];

export function getTodayDayIndex(): number {
  return new Date().getDay();
}

export function getTomorrowDayIndex(): number {
  return (new Date().getDay() + 1) % 7;
}

export function customerHasVisitDay(customerVisitDays: string[] | undefined, dayIndex: number): boolean {
  if (!customerVisitDays || !Array.isArray(customerVisitDays) || customerVisitDays.length === 0) {
    return false;
  }
  const targetDay = WEEK_DAYS.find((d) => d.dayIndex === dayIndex);
  if (!targetDay) return false;

  return customerVisitDays.some(
    (d) =>
      d === targetDay.id ||
      d === targetDay.name ||
      d === String(dayIndex)
  );
}

export function getCustomerVisitStatus(
  customerVisitDays: string[] | undefined,
  balance: number = 0
): {
  status: "today" | "tomorrow" | "overdue" | "upcoming" | "none";
  label: string;
  badgeClass: string;
  dotColor: string;
} {
  if (!customerVisitDays || !Array.isArray(customerVisitDays) || customerVisitDays.length === 0) {
    return { status: "none", label: "", badgeClass: "", dotColor: "" };
  }

  const todayIndex = getTodayDayIndex();
  const tomorrowIndex = getTomorrowDayIndex();

  const isToday = customerHasVisitDay(customerVisitDays, todayIndex);
  const isTomorrow = customerHasVisitDay(customerVisitDays, tomorrowIndex);

  if (isToday) {
    return {
      status: "today",
      label: "🟢 سەردانی ئەمڕۆ",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold",
      dotColor: "bg-emerald-500",
    };
  }

  if (isTomorrow) {
    return {
      status: "tomorrow",
      label: "🟡 سەردانی سبەی",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-300 font-bold",
      dotColor: "bg-amber-500",
    };
  }

  // Check if any visit day passed earlier in the week and balance > 0
  let passedVisitDay = false;
  let futureVisitDay = false;

  for (const day of WEEK_DAYS) {
    if (customerHasVisitDay(customerVisitDays, day.dayIndex)) {
      if (day.dayIndex < todayIndex) {
        passedVisitDay = true;
      } else if (day.dayIndex > todayIndex) {
        futureVisitDay = true;
      }
    }
  }

  if (passedVisitDay && balance > 0) {
    return {
      status: "overdue",
      label: "🔴 سەردانی دواخراو",
      badgeClass: "bg-rose-50 text-rose-800 border-rose-300 font-bold",
      dotColor: "bg-rose-500",
    };
  }

  if (futureVisitDay || customerVisitDays.length > 0) {
    return {
      status: "upcoming",
      label: "🔵 سەردانی هەفتەی داهاتوو",
      badgeClass: "bg-blue-50 text-blue-800 border-blue-300 font-bold",
      dotColor: "bg-blue-500",
    };
  }

  return { status: "none", label: "", badgeClass: "", dotColor: "" };
}

export function calculateVisitStats(customers: Array<{ visitDays?: string[] }>) {
  const todayIndex = getTodayDayIndex();
  const tomorrowIndex = getTomorrowDayIndex();

  let todayCount = 0;
  let tomorrowCount = 0;
  let thisWeekCount = 0;

  customers.forEach((c) => {
    if (!c.visitDays || !Array.isArray(c.visitDays) || c.visitDays.length === 0) return;

    thisWeekCount++;

    if (customerHasVisitDay(c.visitDays, todayIndex)) {
      todayCount++;
    }
    if (customerHasVisitDay(c.visitDays, tomorrowIndex)) {
      tomorrowCount++;
    }
  });

  return {
    todayCount,
    tomorrowCount,
    thisWeekCount,
  };
}

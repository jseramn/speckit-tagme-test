import { format, parseISO, startOfDay, subDays } from "date-fns";

export type ExecutivePeriod = "7d" | "30d";

export interface ResolvedPeriod {
  period: ExecutivePeriod;
  from: string;
  to: string;
  fromDate: Date;
  toDate: Date;
  prevFromDate: Date;
  prevToDate: Date;
  days: number;
}

export function resolveExecutivePeriod(
  period: ExecutivePeriod = "7d",
  from?: string,
  to?: string,
): ResolvedPeriod {
  const days = period === "30d" ? 30 : 7;
  const toDate = to ? endOfDay(parseISO(to)) : new Date();
  const fromDate = from
    ? startOfDay(parseISO(from))
    : startOfDay(subDays(toDate, days - 1));

  const spanMs = toDate.getTime() - fromDate.getTime();
  const prevToDate = new Date(fromDate.getTime() - 1);
  const prevFromDate = new Date(prevToDate.getTime() - spanMs);

  return {
    period,
    from: format(fromDate, "yyyy-MM-dd"),
    to: format(toDate, "yyyy-MM-dd"),
    fromDate,
    toDate,
    prevFromDate,
    prevToDate,
    days,
  };
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
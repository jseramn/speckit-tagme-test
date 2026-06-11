import { endOfDay, format, startOfDay, subDays } from "date-fns";

export type ScorecardPeriodPreset = "7d" | "30d" | "90d" | "custom";

export interface ParsedPeriod {
  preset: ScorecardPeriodPreset;
  from: Date;
  to: Date;
  fromIso: string;
  toIso: string;
}

const PRESET_DAYS: Record<Exclude<ScorecardPeriodPreset, "custom">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function parsePeriod(
  period: ScorecardPeriodPreset = "30d",
  fromInput?: string,
  toInput?: string,
  referenceDate: Date = new Date(),
): ParsedPeriod {
  if (period === "custom") {
    if (!fromInput || !toInput) {
      throw new Error("Periodo custom requiere from y to");
    }
    const from = startOfDay(new Date(fromInput));
    const to = endOfDay(new Date(toInput));
    if (from > to) {
      throw new Error("from debe ser anterior a to");
    }
    return toParsed("custom", from, to);
  }

  const days = PRESET_DAYS[period];
  const to = endOfDay(referenceDate);
  const from = startOfDay(subDays(referenceDate, days - 1));
  return toParsed(period, from, to);
}

function toParsed(preset: ScorecardPeriodPreset, from: Date, to: Date): ParsedPeriod {
  return {
    preset,
    from,
    to,
    fromIso: format(from, "yyyy-MM-dd"),
    toIso: format(to, "yyyy-MM-dd"),
  };
}
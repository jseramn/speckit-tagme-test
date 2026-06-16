import type { OperatingHours } from "@/types/executive";

function localHHmm(at: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(at);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

/**
 * Returns true when `at` falls within configured operating hours (CL-02).
 * Outside hours only critical/system alerts should fire.
 */
export function isWithinOperatingHours(
  at: Date,
  hours: OperatingHours,
): boolean {
  const hhmm = localHHmm(at, hours.timezone);
  return hhmm >= hours.start && hhmm < hours.end;
}
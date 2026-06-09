import type { DestinationType } from "@/types";

/** Returns true when the URL should open in a new tab. */
export function isExternalDestination(
  url: string,
  type: DestinationType,
): boolean {
  if (type === "external" || type === "social") return true;

  if (url.startsWith("/") && !url.startsWith("//")) return false;

  if (typeof window === "undefined") {
    return url.startsWith("http");
  }

  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin !== window.location.origin;
  } catch {
    return true;
  }
}

export function isValidDestinationUrl(url: string): boolean {
  try {
    new URL(url, typeof window !== "undefined" ? window.location.origin : "https://tagme.local");
    return true;
  } catch {
    return false;
  }
}
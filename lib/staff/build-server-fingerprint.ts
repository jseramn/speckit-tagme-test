import { createHash } from "crypto";

/**
 * Partial fingerprint from user-agent + client IP (/24 style via first forwarded hop).
 * Used server-side on staff NFC entry (`/s/{tagSlug}`).
 */
export function buildServerFingerprint(
  userAgent: string,
  forwardedFor: string | null,
): string {
  const ip = forwardedFor?.split(",")[0]?.trim() ?? "unknown";
  const raw = `${userAgent}|${ip}`;
  const hash = createHash("sha256").update(raw).digest("hex").slice(0, 32);
  return `sha256:${hash}`;
}
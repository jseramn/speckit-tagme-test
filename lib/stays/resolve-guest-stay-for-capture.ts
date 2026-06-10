import { createEphemeralStay } from "@/lib/stays/create-ephemeral-stay";
import { resolveStayByToken } from "@/lib/stays/resolve-stay-by-token";
import type { GuestStay } from "@/types/staff";

export interface ResolvedGuestStay {
  stay: GuestStay;
  created: boolean;
}

/**
 * Resolves the guest stay for capture APIs.
 * Priority: active formal cookie > active ephemeral cookie > new ephemeral.
 */
export async function resolveGuestStayForCapture(
  venueId: string,
  existingStayToken: string | null,
): Promise<ResolvedGuestStay> {
  if (existingStayToken) {
    const existing = await resolveStayByToken(existingStayToken);
    if (existing && existing.venue_id === venueId) {
      return { stay: existing, created: false };
    }
  }

  const stay = await createEphemeralStay(venueId);
  return { stay, created: true };
}
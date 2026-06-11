import { randomUUID } from "node:crypto";

/** Generates an opaque stay token for guest_stays.stay_token / cookie value. */
export function generateStayToken(): string {
  return randomUUID();
}
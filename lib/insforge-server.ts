import { createClient } from "@insforge/sdk";

/**
 * Server-only InsForge client (service key bypasses RLS).
 * Use only in API routes and scripts — never import in client components.
 */
export function createInsforgeServerClient() {
  const baseUrl = process.env.INSFORGE_URL;
  const serviceKey = process.env.INSFORGE_SERVICE_KEY;

  if (!baseUrl || !serviceKey) {
    throw new Error(
      "Missing INSFORGE_URL or INSFORGE_SERVICE_KEY for server client",
    );
  }

  return createClient({
    baseUrl,
    anonKey: serviceKey,
  });
}
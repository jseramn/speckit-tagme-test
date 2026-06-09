import { createClient } from "@insforge/sdk";

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL ?? process.env.INSFORGE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ?? process.env.INSFORGE_ANON_KEY;

if (!baseUrl || !anonKey) {
  console.warn(
    "[tagme] InsForge browser client: missing INSFORGE_URL or INSFORGE_ANON_KEY",
  );
}

/**
 * Browser-safe InsForge client (anon key, RLS applies).
 */
export const insforge = createClient({
  baseUrl: baseUrl ?? "https://placeholder.insforge.app",
  anonKey: anonKey ?? "placeholder",
});
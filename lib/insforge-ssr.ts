import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";

/**
 * Per-request InsForge client using the staff access-token cookie.
 * Use in Server Components, Route Handlers, and Server Actions.
 */
export async function createInsforgeSsrClient() {
  return createServerClient({
    cookies: await cookies(),
  });
}
/**
 * Vitest helpers for role-scoped InsForge clients (T003).
 * JWTs come from INSFORGE_TEST_*_JWT in .env.local (renew via POST /api/auth/sign-in → access_token).
 */

import { expect } from "vitest";
import { createClient, type InsForgeClient } from "@insforge/sdk";

export type RlsTestRole =
  | "staff"
  | "supervisor"
  | "manager"
  | "admin"
  | "service";

const ROLE_ENV_KEYS: Record<Exclude<RlsTestRole, "service">, string> = {
  staff: "INSFORGE_TEST_STAFF_JWT",
  supervisor: "INSFORGE_TEST_SUPERVISOR_JWT",
  manager: "INSFORGE_TEST_MANAGER_JWT",
  admin: "INSFORGE_TEST_ADMIN_JWT",
};

export function hasRlsTestEnv(): boolean {
  return Boolean(
    process.env.INSFORGE_URL?.trim() &&
      (process.env.INSFORGE_SERVICE_KEY?.trim() ||
        Object.values(ROLE_ENV_KEYS).some((k) => process.env[k]?.trim())),
  );
}

export function getServiceClient(): InsForgeClient {
  const baseUrl = process.env.INSFORGE_URL?.trim();
  const serviceKey = process.env.INSFORGE_SERVICE_KEY?.trim();
  if (!baseUrl || !serviceKey) {
    throw new Error("Missing INSFORGE_URL or INSFORGE_SERVICE_KEY for RLS tests");
  }
  return createClient({ baseUrl, anonKey: serviceKey });
}

function isJwtUsable(jwt: string | undefined): boolean {
  if (!jwt?.trim() || jwt.includes("...")) return false;
  try {
    const payload = JSON.parse(
      Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString("utf8"),
    ) as { exp?: number };
    if (!payload.exp) return true;
    return payload.exp * 1000 > Date.now() + 60_000;
  } catch {
    return false;
  }
}

export function getRoleClient(role: Exclude<RlsTestRole, "service">): InsForgeClient | null {
  const baseUrl = process.env.INSFORGE_URL?.trim();
  const anonKey = process.env.INSFORGE_ANON_KEY?.trim();
  const jwt = process.env[ROLE_ENV_KEYS[role]]?.trim();

  if (!baseUrl || !anonKey || !jwt || !isJwtUsable(jwt)) return null;

  const client = createClient({ baseUrl, anonKey });
  // setAccessToken — not headers — so HttpClient does not overwrite JWT with anonKey.
  client.setAccessToken(jwt);
  return client;
}

export function skipIfNoRole(role: Exclude<RlsTestRole, "service">): InsForgeClient | null {
  const client = getRoleClient(role);
  if (!client) {
    console.warn(`Skipping: set ${ROLE_ENV_KEYS[role]} for ${role} RLS integration test`);
  }
  return client;
}

/** Auth user id (JWT `sub`) for the configured role token. */
export function getRoleAuthUserId(role: Exclude<RlsTestRole, "service">): string | null {
  const jwt = process.env[ROLE_ENV_KEYS[role]]?.trim();
  if (!jwt) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString("utf8"),
    ) as { sub?: string };
    return payload.sub?.trim() ?? null;
  } catch {
    return null;
  }
}

/** PostgREST hides denied SELECT rows (empty set, no error). */
export function expectRlsSelectDenied(result: {
  data: unknown[] | null;
  error: unknown;
}): void {
  expect(result.error).toBeNull();
  expect(result.data ?? []).toHaveLength(0);
}

/** UPDATE/DELETE on rows outside scope affects zero rows without error. */
export function expectRlsWriteNoEffect(result: {
  data: unknown[] | null;
  error: unknown;
}): void {
  expect(result.error).toBeNull();
  expect(result.data ?? []).toHaveLength(0);
}
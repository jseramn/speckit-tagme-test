/**
 * Vitest helpers for role-scoped InsForge clients (T003).
 * Uses user JWT when INSFORGE_TEST_*_JWT env vars are set; otherwise skips integration tests.
 */

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

export function getRoleClient(role: Exclude<RlsTestRole, "service">): InsForgeClient | null {
  const baseUrl = process.env.INSFORGE_URL?.trim();
  const anonKey = process.env.INSFORGE_ANON_KEY?.trim();
  const jwt = process.env[ROLE_ENV_KEYS[role]]?.trim();

  if (!baseUrl || !anonKey || !jwt) return null;

  return createClient({
    baseUrl,
    anonKey,
    headers: { Authorization: `Bearer ${jwt}` },
  });
}

export function skipIfNoRole(role: Exclude<RlsTestRole, "service">): InsForgeClient | null {
  const client = getRoleClient(role);
  if (!client) {
    console.warn(`Skipping: set ${ROLE_ENV_KEYS[role]} for ${role} RLS integration test`);
  }
  return client;
}
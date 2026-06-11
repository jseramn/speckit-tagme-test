import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@insforge/sdk";

function loadEnvFile(filename: string): void {
  const filepath = resolve(process.cwd(), filename);
  if (!existsSync(filepath)) return;

  const content = readFileSync(filepath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
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

const ROLE_SIGN_IN = [
  {
    envKey: "INSFORGE_TEST_SUPERVISOR_JWT",
    email: process.env.STAFF_SEED_SUPERVISOR_EMAIL?.trim() ?? "supervisor.caribe@tagme.pilot",
    password: process.env.STAFF_SEED_PILOT_PASSWORD?.trim() ?? "PilotCaribe2026!",
  },
  {
    envKey: "INSFORGE_TEST_MANAGER_JWT",
    email: process.env.STAFF_SEED_MANAGER_EMAIL?.trim() ?? "manager.caribe@tagme.pilot",
    password: process.env.STAFF_SEED_PILOT_PASSWORD?.trim() ?? "PilotCaribe2026!",
  },
  {
    envKey: "INSFORGE_TEST_STAFF_JWT",
    email: process.env.STAFF_SEED_RECEPTION_EMAIL?.trim() ?? "reception.caribe@tagme.pilot",
    password: process.env.STAFF_SEED_PILOT_PASSWORD?.trim() ?? "PilotCaribe2026!",
  },
] as const;

async function refreshExpiredRoleJwts(): Promise<void> {
  const baseUrl = process.env.INSFORGE_URL?.trim();
  const anonKey = process.env.INSFORGE_ANON_KEY?.trim();
  if (!baseUrl || !anonKey) return;

  const needsRefresh = ROLE_SIGN_IN.some(
    ({ envKey }) => !isJwtUsable(process.env[envKey]),
  );
  if (!needsRefresh) return;

  const authClient = createClient({ baseUrl, anonKey });
  for (const { envKey, email, password } of ROLE_SIGN_IN) {
    if (isJwtUsable(process.env[envKey])) continue;
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
    if (error || !data?.accessToken) {
      console.warn(`[rls-setup] Could not refresh ${envKey} for ${email}: ${error?.message ?? "no token"}`);
      continue;
    }
    process.env[envKey] = data.accessToken;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");
await refreshExpiredRoleJwts();
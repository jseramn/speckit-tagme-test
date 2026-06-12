import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@insforge/sdk";

export const JWT_CACHE_DIR = resolve(process.cwd(), "node_modules/.cache/vitest");
export const JWT_CACHE_FILE = resolve(JWT_CACHE_DIR, "jwt-cache.json");

export const ROLE_SIGN_IN = [
  {
    envKey: "INSFORGE_TEST_SUPERVISOR_JWT",
    email:
      process.env.STAFF_SEED_SUPERVISOR_EMAIL?.trim() ??
      "supervisor.caribe@tagme.pilot",
    password:
      process.env.STAFF_SEED_PILOT_PASSWORD?.trim() ?? "PilotCaribe2026!",
  },
  {
    envKey: "INSFORGE_TEST_MANAGER_JWT",
    email:
      process.env.STAFF_SEED_MANAGER_EMAIL?.trim() ?? "manager.caribe@tagme.pilot",
    password:
      process.env.STAFF_SEED_PILOT_PASSWORD?.trim() ?? "PilotCaribe2026!",
  },
  {
    envKey: "INSFORGE_TEST_STAFF_JWT",
    email:
      process.env.STAFF_SEED_RECEPTION_EMAIL?.trim() ??
      "reception.caribe@tagme.pilot",
    password:
      process.env.STAFF_SEED_PILOT_PASSWORD?.trim() ?? "PilotCaribe2026!",
  },
] as const;

export function loadEnvFiles(): void {
  for (const filename of [".env.local", ".env"]) {
    const filepath = resolve(process.cwd(), filename);
    if (!existsSync(filepath)) continue;

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
}

export function isJwtUsable(jwt: string | undefined): boolean {
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

export function readJwtCache(): Record<string, string> | null {
  if (!existsSync(JWT_CACHE_FILE)) return null;
  try {
    const parsed = JSON.parse(readFileSync(JWT_CACHE_FILE, "utf8")) as {
      refreshedAt?: number;
      tokens?: Record<string, string>;
    };
    if (!parsed.tokens || !parsed.refreshedAt) return null;
    if (Date.now() - parsed.refreshedAt > 30 * 60_000) return null;
    const allUsable = ROLE_SIGN_IN.every(({ envKey }) =>
      isJwtUsable(parsed.tokens?.[envKey]),
    );
    return allUsable ? parsed.tokens : null;
  } catch {
    return null;
  }
}

export function writeJwtCache(tokens: Record<string, string>): void {
  mkdirSync(JWT_CACHE_DIR, { recursive: true });
  writeFileSync(
    JWT_CACHE_FILE,
    JSON.stringify({ refreshedAt: Date.now(), tokens }, null, 2),
    "utf8",
  );
}

export function applyJwtTokens(tokens: Record<string, string>): void {
  for (const [key, value] of Object.entries(tokens)) {
    if (value) process.env[key] = value;
  }
}

export async function refreshRoleJwts(): Promise<Record<string, string>> {
  const baseUrl = process.env.INSFORGE_URL?.trim();
  const anonKey = process.env.INSFORGE_ANON_KEY?.trim();
  if (!baseUrl || !anonKey) return {};

  const authClient = createClient({ baseUrl, anonKey });
  const tokens: Record<string, string> = {};

  for (const { envKey, email, password } of ROLE_SIGN_IN) {
    if (isJwtUsable(process.env[envKey])) {
      tokens[envKey] = process.env[envKey]!;
      continue;
    }

    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data?.accessToken) {
      console.warn(
        `[auth-setup] Could not refresh ${envKey} for ${email}: ${error?.message ?? "no token"}`,
      );
      continue;
    }

    tokens[envKey] = data.accessToken;
    process.env[envKey] = data.accessToken;
  }

  return tokens;
}

export async function ensureRoleJwts(): Promise<void> {
  loadEnvFiles();

  const cached = readJwtCache();
  if (cached) {
    applyJwtTokens(cached);
    return;
  }

  const needsRefresh = ROLE_SIGN_IN.some(
    ({ envKey }) => !isJwtUsable(process.env[envKey]),
  );
  if (!needsRefresh) return;

  const tokens = await refreshRoleJwts();
  if (Object.keys(tokens).length > 0) {
    writeJwtCache(tokens);
  }
}
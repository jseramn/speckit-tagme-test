#!/usr/bin/env tsx
/**
 * TagMe MVP — Apply SQL migrations from supabase/migrations/
 *
 * Usage:
 *   npm run db:migrate                    # list + manual instructions (no credentials)
 *   npm run db:migrate -- --cli           # InsForge CLI migrations up --all (requires link)
 *   npm run db:migrate -- --probe         # test SDK connectivity (requires .env.local)
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase", "migrations");
const USE_CLI = process.argv.includes("--cli");
const PROBE_SDK = process.argv.includes("--probe");

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

loadEnvFile(".env.local");
loadEnvFile(".env");

function discoverMigrations(): string[] {
  if (!existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }

  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => join(MIGRATIONS_DIR, f));
}

function printManualInstructions(files: string[]): void {
  console.log("\n" + "=".repeat(72));
  console.log("APLICAR MIGRACIONES — InsForge");
  console.log("=".repeat(72));
  console.log(`
@insforge/sdk no expone SQL raw (solo PostgREST). Opciones:

  A) InsForge CLI (recomendado):
     npx @insforge/cli login
     npx @insforge/cli link --project-id <id> --org-id <org>
     npx tsx scripts/sync-migrations-to-insforge.ts
     npm run db:migrate -- --cli

  B) Dashboard InsForge → SQL Editor (en orden):
`);

  files.forEach((file, i) => {
    console.log(`     ${i + 1}. ${file}`);
  });

  console.log("\n" + "=".repeat(72));
}

function syncInsforgeMigrations(): boolean {
  console.log("→ Sync supabase/migrations → migrations/\n");
  const result = spawnSync("npx", ["tsx", "scripts/sync-migrations-to-insforge.ts"], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  return result.status === 0;
}

function runMigrationsUpAll(): boolean {
  console.log("→ CLI: db migrations up --all\n");
  const result = spawnSync(
    "npx",
    ["@insforge/cli", "db", "migrations", "up", "--all"],
    { stdio: "inherit", shell: true, env: process.env },
  );

  if (result.status !== 0) {
    console.error(`✗ Falló db migrations up --all (exit ${result.status})`);
    return false;
  }

  console.log("✓ Migraciones aplicadas\n");
  return true;
}

async function probeSdk(): Promise<void> {
  const baseUrl = process.env.INSFORGE_URL;
  const serviceKey = process.env.INSFORGE_SERVICE_KEY;
  if (!baseUrl || !serviceKey) {
    console.error("Faltan INSFORGE_URL o INSFORGE_SERVICE_KEY en .env.local");
    process.exit(1);
  }

  const { createClient } = await import("@insforge/sdk");
  const client = createClient({ baseUrl, anonKey: serviceKey });
  const { error } = await client.database.from("venues").select("id").limit(1);

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "PGRST205" || code === "42P01") {
      console.log("✓ SDK conectado — tabla venues aún no existe (aplicar migraciones).");
      return;
    }
    console.warn(`⚠ SDK: ${error.message}`);
    return;
  }

  console.log("✓ SDK conectado — venues accesible.");
}

async function main(): Promise<void> {
  const files = discoverMigrations();

  console.log("📦 TagMe migrations\n");
  console.log(`Archivos (${files.length}):\n`);
  for (const f of files) {
    console.log(`  • ${f}`);
  }

  if (PROBE_SDK) {
    await probeSdk();
    return;
  }

  if (USE_CLI) {
    console.log("\nModo CLI (--cli)\n");
    const ok = syncInsforgeMigrations() && runMigrationsUpAll();
    process.exit(ok ? 0 : 1);
  }

  printManualInstructions(files);
  console.log(
    "\nTip: tras configurar .env.local → npm run db:migrate -- --probe\n",
  );
}

main().catch((err: unknown) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
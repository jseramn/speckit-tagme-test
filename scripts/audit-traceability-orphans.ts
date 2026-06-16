#!/usr/bin/env tsx
/**
 * TR-09: Auditoría de registros huérfanos (origen trazable).
 * Debe retornar 0 filas en feedback_entries e incident_reports.
 *
 * Uso: npm run audit:orphans
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Database } from "@insforge/sdk";

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
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");

async function countOrphans(
  db: Database,
  table: string,
  conditions: string,
): Promise<number> {
  const { count, error } = await db
    .from(table)
    .select("id", { count: "exact", head: true })
    .or(conditions);

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return count ?? 0;
}

async function main() {
  const baseUrl = process.env.INSFORGE_URL;
  const serviceKey = process.env.INSFORGE_SERVICE_KEY;

  if (!baseUrl || !serviceKey) {
    throw new Error("Missing INSFORGE_URL or INSFORGE_SERVICE_KEY");
  }

  const { createClient } = await import("@insforge/sdk");
  const client = createClient({ baseUrl, anonKey: serviceKey });
  const db = client.database;

  const feedbackOrphans = await countOrphans(
    db,
    "feedback_entries",
    "origin_type.is.null,origin_id.is.null,guest_stay_id.is.null",
  );

  const incidentOrphans = await countOrphans(
    db,
    "incident_reports",
    "origin_type.is.null,origin_id.is.null,guest_stay_id.is.null",
  );

  console.log("=== Auditoría TR-09 — registros huérfanos ===");
  console.log(`feedback_entries sin origen/estadía: ${feedbackOrphans}`);
  console.log(`incident_reports sin origen/estadía: ${incidentOrphans}`);

  const total = feedbackOrphans + incidentOrphans;
  if (total > 0) {
    console.error("FAIL: se encontraron registros huérfanos");
    process.exit(1);
  }

  console.log("PASS: 0 registros huérfanos");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
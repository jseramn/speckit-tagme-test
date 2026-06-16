#!/usr/bin/env tsx
/**
 * Copies supabase/migrations/*.sql → migrations/<timestamp>_<name>.sql
 * Strips BEGIN/COMMIT (InsForge wraps each migration in its own transaction).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const SRC_DIR = resolve(process.cwd(), "supabase", "migrations");
const DST_DIR = resolve(process.cwd(), "migrations");

const MAP: Array<{ src: string; dst: string }> = [
  { src: "001_initial_schema.sql", dst: "20260608120000_initial-schema.sql" },
  { src: "002_rls_policies.sql", dst: "20260608120001_rls-policies.sql" },
  { src: "003_metrics_views.sql", dst: "20260608120002_metrics-views.sql" },
  { src: "004_staff_schema.sql", dst: "20260610120000_staff-schema.sql" },
  { src: "005_staff_rls.sql", dst: "20260610120001_staff-rls.sql" },
  { src: "006_staff_scorecard_views.sql", dst: "20260610120002_staff-scorecard-views.sql" },
];

function stripTransaction(sql: string): string {
  return sql
    .replace(/^BEGIN;\s*\r?\n/m, "")
    .replace(/\r?\nCOMMIT;\s*$/m, "")
    .trimEnd() + "\n";
}

if (!existsSync(DST_DIR)) mkdirSync(DST_DIR, { recursive: true });

for (const { src, dst } of MAP) {
  const content = stripTransaction(readFileSync(join(SRC_DIR, src), "utf8"));
  writeFileSync(join(DST_DIR, dst), content, "utf8");
  console.log(`✓ ${dst}`);
}
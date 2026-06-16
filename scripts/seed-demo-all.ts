#!/usr/bin/env tsx
/**
 * Demo Hotel Caribe — Orquestador de seeds para preparación de demo (T006)
 *
 * Ejecuta en orden los seeds necesarios para la demo piloto.
 * Idempotente: cada sub-seed omite datos ya presentes (seguro de re-ejecutar).
 *
 * Usage:
 *   npm run seed:demo
 *   npx tsx scripts/seed-demo-all.ts
 *
 * Prerequisites: venue base (npm run seed) y credenciales en .env.local
 */

import { spawnSync } from "node:child_process";
import { loadSeedEnv, requireEnv } from "./lib/seed-env";

loadSeedEnv();

const VENUE_SLUG = "hotel-caribe";
const DEMO_INCIDENTS_SEED_TAG = "seed-demo-hotel-prep";
const SCORECARD_SEED_TAG = "seed-f3-scorecard-feedbacks";

const SEED_STEPS = [
  { script: "seed:staff", label: "Estructura org + staff NFC + categorías" },
  { script: "seed:pilot-users", label: "Usuarios piloto (supervisor, manager, recepción)" },
  { script: "seed:scorecards", label: "Feedbacks scorecard (n≥6 por empleado)" },
  { script: "seed:demo-incidents", label: "Incidencias demo para bandeja supervisor" },
] as const;

type IncidentStatus = "abierta" | "en_progreso" | "resuelta";

function runNpmScript(script: string, step: number, total: number): void {
  const label = SEED_STEPS[step - 1]?.label ?? script;
  console.log("\n" + "─".repeat(72));
  console.log(`Paso ${step}/${total}: npm run ${script}`);
  console.log(`  → ${label}`);
  console.log("─".repeat(72));

  const result = spawnSync("npm", ["run", script], {
    stdio: "inherit",
    shell: true,
    env: process.env,
    cwd: process.cwd(),
  });

  if (result.status !== 0) {
    throw new Error(
      `Paso ${step} falló: npm run ${script} (exit ${result.status ?? "unknown"})`,
    );
  }

  console.log(`✓ Paso ${step}/${total} completado`);
}

async function createInsforgeDb() {
  const { createClient } = await import("@insforge/sdk");
  const baseUrl = requireEnv("INSFORGE_URL");
  const serviceKey = requireEnv("INSFORGE_SERVICE_KEY");
  return createClient({ baseUrl, anonKey: serviceKey });
}

async function validateVenue(): Promise<string> {
  const db = await createInsforgeDb();

  const { data: venue, error } = await db.database
    .from("venues")
    .select("id, name")
    .eq("slug", VENUE_SLUG)
    .maybeSingle();

  if (error) {
    throw new Error(`Error consultando venue: ${error.message}`);
  }

  if (!venue?.id) {
    throw new Error(
      `Venue "${VENUE_SLUG}" no encontrado. Ejecute npm run seed antes de seed:demo.`,
    );
  }

  console.log(`✓ Venue validado: ${venue.name} (${venue.id})`);
  return venue.id as string;
}

async function countDemoIncidentsByStatus(
  venueId: string,
): Promise<Record<IncidentStatus, number>> {
  const db = await createInsforgeDb();
  const counts: Record<IncidentStatus, number> = {
    abierta: 0,
    en_progreso: 0,
    resuelta: 0,
  };

  const { data, error } = await db.database
    .from("incident_reports")
    .select("status")
    .eq("venue_id", venueId)
    .contains("context_snapshot", { seed_tag: DEMO_INCIDENTS_SEED_TAG });

  if (error) {
    throw new Error(`No se pudo contar incidencias demo: ${error.message}`);
  }

  for (const row of data ?? []) {
    const status = row.status as IncidentStatus;
    if (status in counts) counts[status]++;
  }

  return counts;
}

async function countScorecardFeedbacks(venueId: string): Promise<number> {
  const db = await createInsforgeDb();

  const { count, error } = await db.database
    .from("feedback_entries")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venueId)
    .contains("context_snapshot", { seed_tag: SCORECARD_SEED_TAG });

  if (error) {
    throw new Error(`No se pudo contar feedbacks scorecard: ${error.message}`);
  }

  return count ?? 0;
}

async function countActiveStaff(venueId: string): Promise<number> {
  const db = await createInsforgeDb();

  const { count, error } = await db.database
    .from("staff_members")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venueId)
    .eq("is_active", true);

  if (error) {
    throw new Error(`No se pudo contar staff: ${error.message}`);
  }

  return count ?? 0;
}

function printFinalSummary(
  incidentCounts: Record<IncidentStatus, number>,
  staffCount: number,
  scorecardCount: number,
): void {
  const incidentTotal =
    incidentCounts.abierta +
    incidentCounts.en_progreso +
    incidentCounts.resuelta;

  console.log("\n" + "=".repeat(72));
  console.log("RESUMEN — Demo Hotel Caribe preparada");
  console.log("=".repeat(72));
  console.log("\nSeeds ejecutados:");
  for (const step of SEED_STEPS) {
    console.log(`  ✓ ${step.script} — ${step.label}`);
  }
  console.log("\nDatos en InsForge:");
  console.log(`  Staff activo: ${staffCount}`);
  console.log(`  Feedbacks scorecard (seed): ${scorecardCount}`);
  console.log(`  Incidencias demo (total): ${incidentTotal}`);
  console.log(`    abierta: ${incidentCounts.abierta}`);
  console.log(`    en_progreso: ${incidentCounts.en_progreso}`);
  console.log(`    resuelta: ${incidentCounts.resuelta}`);
  console.log("\nVerificación rápida:");
  console.log("  • Login supervisor.caribe@tagme.pilot → /incidents (≥2 abiertas)");
  console.log("  • Re-ejecutar npm run seed:demo debe omitir registros duplicados");
  console.log("=".repeat(72));
}

async function main(): Promise<void> {
  console.log("=".repeat(72));
  console.log("SEED DEMO — Hotel Caribe (preparación piloto)");
  console.log("=".repeat(72));
  console.log(`Venue: ${VENUE_SLUG}`);
  console.log(`Pasos: ${SEED_STEPS.length} (idempotente, seguro de re-ejecutar)`);

  requireEnv("INSFORGE_URL");
  requireEnv("INSFORGE_SERVICE_KEY");

  const venueId = await validateVenue();

  const total = SEED_STEPS.length;
  for (let i = 0; i < SEED_STEPS.length; i++) {
    runNpmScript(SEED_STEPS[i].script, i + 1, total);
  }

  const [incidentCounts, staffCount, scorecardCount] = await Promise.all([
    countDemoIncidentsByStatus(venueId),
    countActiveStaff(venueId),
    countScorecardFeedbacks(venueId),
  ]);

  printFinalSummary(incidentCounts, staffCount, scorecardCount);
  console.log("\n✅ seed:demo completado sin errores\n");
}

main().catch((err: unknown) => {
  console.error("\n❌ seed:demo falló:", err instanceof Error ? err.message : err);
  process.exit(1);
});
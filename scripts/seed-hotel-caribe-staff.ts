#!/usr/bin/env tsx
/**
 * TagMe Fase 3 — Seed estructura organizacional Hotel Caribe (T023–T024)
 * Spec: specs/003-staff/data-model.md
 *
 * Idempotent: safe to re-run.
 *
 * Usage:
 *   npx tsx scripts/seed-hotel-caribe-staff.ts
 *
 * Requires: INSFORGE_URL, INSFORGE_SERVICE_KEY in .env.local
 * Optional pilot auth users (create if missing):
 *   STAFF_SEED_SUPERVISOR_EMAIL, STAFF_SEED_MANAGER_EMAIL, STAFF_SEED_RECEPTION_EMAIL
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const VENUE_SLUG = "hotel-caribe";
const SEED_TAG = "seed-f3-hotel-caribe";

const DEPARTMENTS = [
  { code: "RECEPCION", name: "Recepción" },
  { code: "HK", name: "Housekeeping" },
  { code: "FB", name: "Alimentos y Bebidas" },
  { code: "MANT", name: "Mantenimiento" },
] as const;

const JOB_ROLES: Record<string, string[]> = {
  RECEPCION: ["Recepcionista", "Concierge", "Jefe de Recepción"],
  HK: ["Camarista", "Supervisor de Piso", "Botones"],
  FB: ["Mesero", "Bartender", "Chef de Partida"],
  MANT: ["Técnico HVAC", "Electricista", "Jefe de Mantenimiento"],
};

const SHIFT_NAMES = ["Mañana 6–14", "Tarde 14–22", "Noche 22–6"];

const INCIDENT_CATEGORIES = [
  { code: "mantenimiento", label: "Mantenimiento", priority: "alta" as const },
  { code: "limpieza", label: "Limpieza", priority: "media" as const },
  { code: "ruido", label: "Ruido", priority: "media" as const },
  { code: "f_and_b", label: "Alimentos y Bebidas", priority: "media" as const },
  { code: "otro", label: "Otro", priority: "baja" as const },
];

const STAFF_PILOT = [
  { dept: "RECEPCION", name: "Ana R.", slug: "caribe-staff-ana-r", code: "REC-001" },
  { dept: "RECEPCION", name: "Luis M.", slug: "caribe-staff-luis-m", code: "REC-002" },
  { dept: "HK", name: "María G.", slug: "caribe-staff-maria-g", code: "HK-001" },
  { dept: "HK", name: "Carlos P.", slug: "caribe-staff-carlos-p", code: "HK-002" },
  { dept: "HK", name: "Diana S.", slug: "caribe-staff-diana-s", code: "HK-003" },
  { dept: "HK", name: "Pedro L.", slug: "caribe-staff-pedro-l", code: "HK-004" },
  { dept: "FB", name: "Sofía T.", slug: "caribe-staff-sofia-t", code: "FB-001" },
  { dept: "FB", name: "Jorge V.", slug: "caribe-staff-jorge-v", code: "FB-002" },
  { dept: "FB", name: "Laura N.", slug: "caribe-staff-laura-n", code: "FB-003" },
  { dept: "MANT", name: "Roberto H.", slug: "caribe-staff-roberto-h", code: "MAN-001" },
  { dept: "MANT", name: "Elena C.", slug: "caribe-staff-elena-c", code: "MAN-002" },
  { dept: "MANT", name: "Miguel A.", slug: "caribe-staff-miguel-a", code: "MAN-003" },
] as const;

interface DeptMap {
  [code: string]: string;
}

type InsforgeDb = Awaited<ReturnType<typeof createInsforgeDb>>;

async function createInsforgeDb() {
  const { createClient } = await import("@insforge/sdk");
  const baseUrl = process.env.INSFORGE_URL?.trim();
  const serviceKey = process.env.INSFORGE_SERVICE_KEY?.trim();
  if (!baseUrl || !serviceKey) {
    throw new Error("Missing INSFORGE_URL or INSFORGE_SERVICE_KEY");
  }
  return createClient({ baseUrl, anonKey: serviceKey });
}

async function main(): Promise<void> {
  const db = await createInsforgeDb();

  const { data: venue, error: venueError } = await db.database
    .from("venues")
    .select("id, slug, name")
    .eq("slug", VENUE_SLUG)
    .maybeSingle();

  if (venueError || !venue) {
    throw new Error(
      `Venue ${VENUE_SLUG} not found. Run npm run seed (F1) first.`,
    );
  }

  const venueId = venue.id as string;
  console.log(`✓ Venue: ${venue.name} (${venueId})`);

  await upsertVenueStaffSettings(db, venueId);

  const deptMap = await upsertDepartments(db, venueId);
  const roleMap = await upsertJobRoles(db, deptMap);
  await upsertShifts(db, deptMap);
  await upsertIncidentCategories(db, venueId, deptMap);
  const memberMap = await upsertStaffMembers(db, venueId, deptMap, roleMap);
  await upsertStaffNfcTags(db, memberMap);
  await linkShiftAssignments(db, memberMap, deptMap);

  console.log("\n✓ Seed F3 Hotel Caribe staff org complete");
  console.log("  Siguiente paso: npm run seed:pilot-users");
  console.log(`  Departments: ${Object.keys(deptMap).length}`);
  console.log(`  Staff members: ${Object.keys(memberMap).length}`);
  console.log(`  NFC slugs: /s/caribe-staff-*`);
}

async function upsertVenueStaffSettings(
  db: InsforgeDb,
  venueId: string,
): Promise<void> {
  const { error } = await db.database.from("venue_staff_settings").upsert(
    [
      {
        venue_id: venueId,
        staff_feedback_enabled: true,
        default_stay_ttl_days: 7,
        ephemeral_stay_ttl_hours: 48,
        session_ttl_minutes: 5,
        session_dedup_seconds: 45,
        min_feedbacks_for_nps: 6,
      },
    ],
    { onConflict: "venue_id" },
  );
  if (error) throw new Error(`venue_staff_settings: ${error.message}`);
  console.log("✓ venue_staff_settings");
}

async function upsertDepartments(
  db: InsforgeDb,
  venueId: string,
): Promise<DeptMap> {
  const map: DeptMap = {};

  for (const dept of DEPARTMENTS) {
    const { data: existing } = await db.database
      .from("departments")
      .select("id")
      .eq("venue_id", venueId)
      .eq("code", dept.code)
      .maybeSingle();

    if (existing?.id) {
      map[dept.code] = existing.id as string;
      continue;
    }

    const { data, error } = await db.database
      .from("departments")
      .insert([{ venue_id: venueId, name: dept.name, code: dept.code }])
      .select("id, code")
      .single();

    if (error || !data) throw new Error(`department ${dept.code}: ${error?.message}`);
    map[dept.code] = data.id as string;
  }

  console.log(`✓ departments (${Object.keys(map).length})`);
  return map;
}

async function upsertJobRoles(
  db: InsforgeDb,
  deptMap: DeptMap,
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};

  for (const [deptCode, titles] of Object.entries(JOB_ROLES)) {
    const departmentId = deptMap[deptCode];
    for (const title of titles) {
      const key = `${deptCode}:${title}`;
      const { data: existing } = await db.database
        .from("job_roles")
        .select("id")
        .eq("department_id", departmentId)
        .eq("title", title)
        .maybeSingle();

      if (existing?.id) {
        map[key] = existing.id as string;
        continue;
      }

      const { data, error } = await db.database
        .from("job_roles")
        .insert([{ department_id: departmentId, title }])
        .select("id")
        .single();

      if (error || !data) throw new Error(`job_role ${title}: ${error?.message}`);
      map[key] = data.id as string;
    }
  }

  console.log(`✓ job_roles (${Object.keys(map).length})`);
  return map;
}

async function upsertShifts(
  db: InsforgeDb,
  deptMap: DeptMap,
): Promise<void> {
  let count = 0;
  for (const deptCode of Object.keys(deptMap)) {
    const departmentId = deptMap[deptCode];
    for (const name of SHIFT_NAMES) {
      const { data: existing } = await db.database
        .from("shifts")
        .select("id")
        .eq("department_id", departmentId)
        .eq("name", name)
        .maybeSingle();

      if (existing?.id) continue;

      const { error } = await db.database.from("shifts").insert([
        {
          department_id: departmentId,
          name,
          days_of_week: [1, 2, 3, 4, 5, 6, 7],
        },
      ]);
      if (error) throw new Error(`shift ${name}: ${error.message}`);
      count++;
    }
  }
  console.log(`✓ shifts (created ${count} new)`);
}

async function upsertIncidentCategories(
  db: InsforgeDb,
  venueId: string,
  deptMap: DeptMap,
): Promise<void> {
  const defaultDept: Record<string, string | null> = {
    mantenimiento: deptMap.MANT,
    limpieza: deptMap.HK,
    ruido: null,
    f_and_b: deptMap.FB,
    otro: null,
  };

  for (let i = 0; i < INCIDENT_CATEGORIES.length; i++) {
    const cat = INCIDENT_CATEGORIES[i];
    const { data: existing } = await db.database
      .from("venue_incident_categories")
      .select("id")
      .eq("venue_id", venueId)
      .eq("code", cat.code)
      .maybeSingle();

    if (existing?.id) continue;

    const { error } = await db.database.from("venue_incident_categories").insert([
      {
        venue_id: venueId,
        code: cat.code,
        label: cat.label,
        default_priority: cat.priority,
        default_department_id: defaultDept[cat.code] ?? null,
        sort_order: i + 1,
      },
    ]);
    if (error) throw new Error(`category ${cat.code}: ${error.message}`);
  }
  console.log(`✓ venue_incident_categories (${INCIDENT_CATEGORIES.length})`);
}

async function upsertStaffMembers(
  db: InsforgeDb,
  venueId: string,
  deptMap: DeptMap,
  roleMap: Record<string, string>,
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};

  for (const staff of STAFF_PILOT) {
    const { data: existing } = await db.database
      .from("staff_members")
      .select("id")
      .eq("venue_id", venueId)
      .eq("employee_code", staff.code)
      .maybeSingle();

    if (existing?.id) {
      map[staff.slug] = existing.id as string;
      continue;
    }

    const jobRoleId = roleMap[`${staff.dept}:${JOB_ROLES[staff.dept as keyof typeof JOB_ROLES][0]}`];

    const { data, error } = await db.database
      .from("staff_members")
      .insert([
        {
          venue_id: venueId,
          department_id: deptMap[staff.dept],
          job_role_id: jobRoleId,
          display_name: staff.name,
          employee_code: staff.code,
        },
      ])
      .select("id")
      .single();

    if (error || !data) throw new Error(`staff ${staff.name}: ${error?.message}`);
    map[staff.slug] = data.id as string;
  }

  console.log(`✓ staff_members (${Object.keys(map).length})`);
  return map;
}

async function upsertStaffNfcTags(
  db: InsforgeDb,
  memberMap: Record<string, string>,
): Promise<void> {
  for (const staff of STAFF_PILOT) {
    const staffMemberId = memberMap[staff.slug];
    const { data: existing } = await db.database
      .from("staff_nfc_tags")
      .select("id")
      .eq("tag_slug", staff.slug)
      .maybeSingle();

    if (existing?.id) continue;

    const { error } = await db.database.from("staff_nfc_tags").insert([
      {
        staff_member_id: staffMemberId,
        tag_slug: staff.slug,
        is_active: true,
      },
    ]);
    if (error) throw new Error(`nfc tag ${staff.slug}: ${error.message}`);
  }
  console.log(`✓ staff_nfc_tags (${STAFF_PILOT.length})`);
}

async function linkShiftAssignments(
  db: InsforgeDb,
  memberMap: Record<string, string>,
  deptMap: DeptMap,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  for (const staff of STAFF_PILOT) {
    const staffMemberId = memberMap[staff.slug];
    const departmentId = deptMap[staff.dept];

    const { data: shift } = await db.database
      .from("shifts")
      .select("id")
      .eq("department_id", departmentId)
      .eq("name", SHIFT_NAMES[0])
      .maybeSingle();

    if (!shift?.id) continue;

    const { data: existing } = await db.database
      .from("staff_shift_assignments")
      .select("id")
      .eq("staff_member_id", staffMemberId)
      .eq("shift_id", shift.id)
      .maybeSingle();

    if (existing?.id) continue;

    const { error } = await db.database.from("staff_shift_assignments").insert([
      {
        staff_member_id: staffMemberId,
        shift_id: shift.id,
        effective_from: today,
      },
    ]);
    if (error) throw new Error(`shift assignment: ${error.message}`);
  }
  console.log("✓ staff_shift_assignments");
}

main().catch((err: unknown) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
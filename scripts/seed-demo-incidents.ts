#!/usr/bin/env tsx
/**
 * Demo Hotel Caribe — Seed incidencias precargadas para bandeja supervisor (T003)
 *
 * Idempotent: safe to re-run; skips if seed_tag already present.
 *
 * Usage:
 *   npm run seed:demo-incidents
 *   npx tsx scripts/seed-demo-incidents.ts
 *
 * Prerequisites: npm run seed && npm run seed:staff
 * Requires: INSFORGE_URL, INSFORGE_SERVICE_KEY in .env.local
 */

import { loadSeedEnv, requireEnv } from "./lib/seed-env";

loadSeedEnv();

const VENUE_SLUG = "hotel-caribe";
const SEED_TAG = "seed-demo-hotel-prep";

type IncidentStatus = "abierta" | "en_progreso" | "resuelta";
type OriginType = "staff_nfc" | "room_nfc";

interface DemoIncidentSpec {
  seedKey: string;
  category: string;
  status: IncidentStatus;
  description: string;
  originType: OriginType;
  staffSlug?: string;
  roomSlug?: string;
  roomNumber?: string;
  daysAgo: number;
  assignedToSlug?: string;
}

const DEMO_INCIDENTS: DemoIncidentSpec[] = [
  {
    seedKey: "hk-toallas-412",
    category: "limpieza",
    status: "abierta",
    description: "Faltan toallas en habitación 412",
    originType: "staff_nfc",
    staffSlug: "caribe-staff-maria-g",
    roomNumber: "412",
    daysAgo: 0,
  },
  {
    seedKey: "ruido-obra-p4",
    category: "ruido",
    status: "abierta",
    description: "Ruido de obra en pasillo piso 4",
    originType: "staff_nfc",
    staffSlug: "caribe-staff-ana-r",
    roomNumber: "408",
    daysAgo: 0,
  },
  {
    seedKey: "hk-amenities-312",
    category: "limpieza",
    status: "abierta",
    description: "Baño sin amenities en habitación 312",
    originType: "staff_nfc",
    staffSlug: "caribe-staff-carlos-p",
    roomNumber: "312",
    daysAgo: 1,
  },
  {
    seedKey: "room-minibar-412",
    category: "f_and_b",
    status: "abierta",
    description: "Minibar sin hielo ni reposición desde ayer",
    originType: "room_nfc",
    roomSlug: "caribe-room-412",
    daysAgo: 0,
  },
  {
    seedKey: "mant-ac-408",
    category: "mantenimiento",
    status: "en_progreso",
    description: "Aire acondicionado con ruido irregular en 408",
    originType: "staff_nfc",
    staffSlug: "caribe-staff-roberto-h",
    roomNumber: "408",
    assignedToSlug: "caribe-staff-roberto-h",
    daysAgo: 1,
  },
  {
    seedKey: "mant-fuga-508",
    category: "mantenimiento",
    status: "en_progreso",
    description: "Fuga leve en ducha de habitación 508",
    originType: "staff_nfc",
    staffSlug: "caribe-staff-elena-c",
    roomNumber: "508",
    assignedToSlug: "caribe-staff-elena-c",
    daysAgo: 2,
  },
  {
    seedKey: "fb-room-service",
    category: "f_and_b",
    status: "en_progreso",
    description: "Room service retrasado más de 45 minutos",
    originType: "staff_nfc",
    staffSlug: "caribe-staff-sofia-t",
    roomNumber: "601",
    assignedToSlug: "caribe-staff-sofia-t",
    daysAgo: 1,
  },
  {
    seedKey: "hk-sabanas-205",
    category: "limpieza",
    status: "resuelta",
    description: "Sábanas con manchas en habitación 205",
    originType: "staff_nfc",
    staffSlug: "caribe-staff-diana-s",
    roomNumber: "205",
    daysAgo: 3,
  },
  {
    seedKey: "mant-luz-601",
    category: "mantenimiento",
    status: "resuelta",
    description: "Luz del baño fundida en habitación 601",
    originType: "staff_nfc",
    staffSlug: "caribe-staff-miguel-a",
    roomNumber: "601",
    daysAgo: 4,
  },
  {
    seedKey: "fb-desayuno",
    category: "f_and_b",
    status: "resuelta",
    description: "Pedido de desayuno incompleto en habitación 312",
    originType: "staff_nfc",
    staffSlug: "caribe-staff-jorge-v",
    roomNumber: "312",
    daysAgo: 5,
  },
  {
    seedKey: "otro-cuna",
    category: "otro",
    status: "resuelta",
    description: "Solicitud de cuna extra no entregada a tiempo",
    originType: "staff_nfc",
    staffSlug: "caribe-staff-luis-m",
    roomNumber: "205",
    daysAgo: 6,
  },
  {
    seedKey: "room-persiana-508",
    category: "mantenimiento",
    status: "resuelta",
    description: "Persiana atascada en habitación 508",
    originType: "room_nfc",
    roomSlug: "caribe-room-508",
    daysAgo: 7,
  },
];

type InsforgeDb = Awaited<ReturnType<typeof createInsforgeDb>>;

interface StaffContext {
  staffMemberId: string;
  tagId: string;
  displayName: string;
  departmentId: string;
  departmentName: string;
  jobRoleId: string;
  jobRoleTitle: string;
}

interface RoomContext {
  tagId: string;
  slug: string;
  label: string;
  zone: string;
  roomNumber: string | null;
}

interface CategoryContext {
  code: string;
  defaultPriority: string;
  departmentId: string | null;
}

async function createInsforgeDb() {
  const { createClient } = await import("@insforge/sdk");
  const baseUrl = requireEnv("INSFORGE_URL");
  const serviceKey = requireEnv("INSFORGE_SERVICE_KEY");
  return createClient({ baseUrl, anonKey: serviceKey });
}

async function main(): Promise<void> {
  const db = await createInsforgeDb();

  const { data: venue, error: venueError } = await db.database
    .from("venues")
    .select("id, name, timezone")
    .eq("slug", VENUE_SLUG)
    .maybeSingle();

  if (venueError || !venue?.id) {
    throw new Error(
      `Venue ${VENUE_SLUG} not found. Run npm run seed first.`,
    );
  }

  const venueId = venue.id as string;
  const venueTimezone =
    (venue.timezone as string | null) ?? "America/Bogota";

  console.log(`✓ Venue: ${venue.name} (${venueId})`);

  const { data: existingSeed } = await db.database
    .from("incident_reports")
    .select("id")
    .eq("venue_id", venueId)
    .contains("context_snapshot", { seed_tag: SEED_TAG })
    .limit(1);

  if (existingSeed?.length) {
    const counts = await countByStatus(db, venueId);
    console.log("Demo incidents already exist — skipping (idempotent)");
    printSummary(counts);
    return;
  }

  const guestStayId = await resolveGuestStay(db, venueId);
  const staffBySlug = await loadStaffContexts(db, venueId);
  const roomBySlug = await loadRoomContexts(db, venueId);
  const categories = await loadCategories(db, venueId);

  let inserted = 0;
  const statusCounts: Record<IncidentStatus, number> = {
    abierta: 0,
    en_progreso: 0,
    resuelta: 0,
  };

  for (const spec of DEMO_INCIDENTS) {
    const category = categories.get(spec.category);
    if (!category) {
      throw new Error(
        `Category ${spec.category} not found. Run npm run seed:staff first.`,
      );
    }

    const createdAt = new Date(
      Date.now() - spec.daysAgo * 24 * 60 * 60 * 1000,
    ).toISOString();

    const resolvedAt =
      spec.status === "resuelta"
        ? new Date(
            Date.now() -
              spec.daysAgo * 24 * 60 * 60 * 1000 +
              4 * 60 * 60 * 1000,
          ).toISOString()
        : null;

    let staffMemberId: string | null = null;
    let originId: string;
    let originType = spec.originType;
    let contextSnapshot: Record<string, unknown>;

    if (spec.originType === "staff_nfc") {
      const staff = staffBySlug.get(spec.staffSlug!);
      if (!staff) {
        throw new Error(`Staff slug ${spec.staffSlug} not found`);
      }

      staffMemberId = staff.staffMemberId;
      originId = staff.tagId;
      contextSnapshot = {
        staff_member_id: staff.staffMemberId,
        display_name: staff.displayName,
        department_id: staff.departmentId,
        department_name: staff.departmentName,
        job_role_id: staff.jobRoleId,
        job_role_title: staff.jobRoleTitle,
        shift_id: null,
        shift_name: null,
        staff_nfc_tag_id: staff.tagId,
        venue_timezone: venueTimezone,
        seed_tag: SEED_TAG,
        seed_key: spec.seedKey,
      };

      if (spec.roomNumber) {
        contextSnapshot.room_number = spec.roomNumber;
      }
    } else {
      const room = roomBySlug.get(spec.roomSlug!);
      if (!room) {
        throw new Error(`Room slug ${spec.roomSlug} not found`);
      }

      originId = room.tagId;
      contextSnapshot = {
        origin_type: "room_nfc",
        nfc_tag_id: room.tagId,
        tag_slug: room.slug,
        tag_label: room.label,
        zone: room.zone,
        room_number: room.roomNumber,
        seed_tag: SEED_TAG,
        seed_key: spec.seedKey,
      };
    }

    const assignedTo =
      spec.assignedToSlug != null
        ? (staffBySlug.get(spec.assignedToSlug)?.staffMemberId ?? null)
        : null;

    const { error } = await db.database.from("incident_reports").insert([
      {
        venue_id: venueId,
        guest_stay_id: guestStayId,
        staff_member_id: staffMemberId,
        department_id: category.departmentId,
        origin_type: originType,
        origin_id: originId,
        category: category.code,
        priority: category.defaultPriority,
        status: spec.status,
        description: spec.description,
        context_snapshot: contextSnapshot,
        assigned_to: assignedTo,
        created_at: createdAt,
        resolved_at: resolvedAt,
      },
    ]);

    if (error) {
      throw new Error(`incident ${spec.seedKey}: ${error.message}`);
    }

    inserted++;
    statusCounts[spec.status]++;
  }

  console.log(`✓ Inserted ${inserted} demo incidents (seed_tag: ${SEED_TAG})`);
  printSummary(statusCounts);
}

async function resolveGuestStay(
  db: InsforgeDb,
  venueId: string,
): Promise<string> {
  const { data: stay } = await db.database
    .from("guest_stays")
    .select("id")
    .eq("venue_id", venueId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (stay?.id) return stay.id as string;

  const token = `seed-demo-inc-${Date.now()}`;
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: newStay, error } = await db.database
    .from("guest_stays")
    .insert([
      {
        venue_id: venueId,
        stay_token: token,
        stay_type: "formal",
        status: "active",
        expires_at: expires,
      },
    ])
    .select("id")
    .single();

  if (error || !newStay?.id) {
    throw new Error(`guest_stay: ${error?.message ?? "insert failed"}`);
  }

  console.log("✓ guest_stay (created ephemeral for demo incidents)");
  return newStay.id as string;
}

async function loadStaffContexts(
  db: InsforgeDb,
  venueId: string,
): Promise<Map<string, StaffContext>> {
  const { data: members, error } = await db.database
    .from("staff_members")
    .select(
      `
      id,
      display_name,
      department_id,
      job_role_id,
      departments ( name ),
      job_roles ( title ),
      staff_nfc_tags ( id, tag_slug )
    `,
    )
    .eq("venue_id", venueId)
    .eq("is_active", true);

  if (error) throw new Error(`staff_members: ${error.message}`);

  const map = new Map<string, StaffContext>();

  for (const row of members ?? []) {
    const tags = row.staff_nfc_tags as
      | { id: string; tag_slug: string }[]
      | { id: string; tag_slug: string }
      | null;

    const tagList = Array.isArray(tags) ? tags : tags ? [tags] : [];
    const tag = tagList[0];
    if (!tag?.tag_slug) continue;

    const dept = row.departments as { name: string } | { name: string }[] | null;
    const role = row.job_roles as { title: string } | { title: string }[] | null;

    map.set(tag.tag_slug, {
      staffMemberId: row.id as string,
      tagId: tag.id,
      displayName: row.display_name as string,
      departmentId: row.department_id as string,
      departmentName: Array.isArray(dept)
        ? (dept[0]?.name ?? "—")
        : (dept?.name ?? "—"),
      jobRoleId: row.job_role_id as string,
      jobRoleTitle: Array.isArray(role)
        ? (role[0]?.title ?? "—")
        : (role?.title ?? "—"),
    });
  }

  console.log(`✓ staff contexts (${map.size})`);
  return map;
}

async function loadRoomContexts(
  db: InsforgeDb,
  venueId: string,
): Promise<Map<string, RoomContext>> {
  const { data: tags, error } = await db.database
    .from("nfc_tags")
    .select("id, slug, label, zone, room_number")
    .eq("venue_id", venueId)
    .eq("is_active", true)
    .eq("zone", "room");

  if (error) throw new Error(`nfc_tags: ${error.message}`);

  const map = new Map<string, RoomContext>();

  for (const tag of tags ?? []) {
    map.set(tag.slug as string, {
      tagId: tag.id as string,
      slug: tag.slug as string,
      label: tag.label as string,
      zone: tag.zone as string,
      roomNumber: (tag.room_number as string | null) ?? null,
    });
  }

  console.log(`✓ room tags (${map.size})`);
  return map;
}

async function loadCategories(
  db: InsforgeDb,
  venueId: string,
): Promise<Map<string, CategoryContext>> {
  const { data: rows, error } = await db.database
    .from("venue_incident_categories")
    .select("code, default_priority, default_department_id")
    .eq("venue_id", venueId)
    .eq("is_active", true);

  if (error) throw new Error(`venue_incident_categories: ${error.message}`);

  const map = new Map<string, CategoryContext>();

  for (const row of rows ?? []) {
    map.set(row.code as string, {
      code: row.code as string,
      defaultPriority: row.default_priority as string,
      departmentId: (row.default_department_id as string | null) ?? null,
    });
  }

  console.log(`✓ incident categories (${map.size})`);
  return map;
}

async function countByStatus(
  db: InsforgeDb,
  venueId: string,
): Promise<Record<IncidentStatus, number>> {
  const counts: Record<IncidentStatus, number> = {
    abierta: 0,
    en_progreso: 0,
    resuelta: 0,
  };

  const { data, error } = await db.database
    .from("incident_reports")
    .select("status")
    .eq("venue_id", venueId)
    .contains("context_snapshot", { seed_tag: SEED_TAG });

  if (error) throw new Error(`count: ${error.message}`);

  for (const row of data ?? []) {
    const status = row.status as IncidentStatus;
    if (status in counts) counts[status]++;
  }

  return counts;
}

function printSummary(counts: Record<IncidentStatus, number>): void {
  const total = counts.abierta + counts.en_progreso + counts.resuelta;
  console.log("\nResumen incidencias demo:");
  console.log(`  Total: ${total}`);
  console.log(`  abierta: ${counts.abierta}`);
  console.log(`  en_progreso: ${counts.en_progreso}`);
  console.log(`  resuelta: ${counts.resuelta}`);
  console.log("\nVerificación:");
  console.log("  1. npm run seed:demo-incidents  (segunda corrida debe omitir)");
  console.log(
    "  2. Login supervisor.caribe@tagme.pilot → /incidents (≥2 abiertas visibles)",
  );
  console.log(
    "  3. SQL: SELECT status, category, description FROM incident_reports",
  );
  console.log(
    `     WHERE context_snapshot->>'seed_tag' = '${SEED_TAG}' ORDER BY created_at DESC;`,
  );
}

main().catch((err: unknown) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
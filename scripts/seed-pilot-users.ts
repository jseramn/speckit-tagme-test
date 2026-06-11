#!/usr/bin/env tsx
/**
 * TagMe Fase 3 — Seed usuarios piloto vinculados a staff_members (T024)
 *
 * Crea (o reutiliza) usuarios InsForge Auth + user_profiles + vínculos staff.
 * Idempotente: seguro ejecutar varias veces.
 *
 * Prerrequisito: npm run seed:staff (estructura org + staff_members + NFC tags)
 *
 * Usage:
 *   npm run seed:pilot-users
 *   npx tsx scripts/seed-pilot-users.ts
 *   npx tsx scripts/seed-pilot-users.ts --verify-only
 *
 * Env opcional (.env.local):
 *   STAFF_SEED_PILOT_PASSWORD=PilotCaribe2026!
 *   STAFF_SEED_SUPERVISOR_EMAIL=supervisor.caribe@tagme.pilot
 *   STAFF_SEED_MANAGER_EMAIL=manager.caribe@tagme.pilot
 *   STAFF_SEED_RECEPTION_EMAIL=reception.caribe@tagme.pilot
 */

import { loadSeedEnv, requireEnv } from "./lib/seed-env";
import {
  findAuthUserByEmail,
  verifyAuthUserEmail,
} from "./lib/insforge-db-query";

type StaffRole = "staff" | "supervisor" | "manager" | "admin" | "ops";

interface PilotSession {
  userId: string;
  profileId: string;
  role: StaffRole;
  venueId: string;
  displayName: string;
  staffMemberId: string | null;
}

loadSeedEnv();

const VENUE_SLUG = "hotel-caribe";
const VERIFY_ONLY = process.argv.includes("--verify-only");

type InsforgeDb = Awaited<ReturnType<typeof createInsforgeDb>>;

interface PilotSpec {
  key: string;
  email: string;
  role: StaffRole;
  displayName: string;
  staffSlug: string | null;
  supervisorDeptCode: string | null;
}

const PILOTS: PilotSpec[] = [
  {
    key: "supervisor",
    email:
      process.env.STAFF_SEED_SUPERVISOR_EMAIL?.trim() ??
      "supervisor.caribe@tagme.pilot",
    role: "supervisor",
    displayName: "Supervisor HK Piloto",
    staffSlug: "caribe-staff-maria-g",
    supervisorDeptCode: "HK",
  },
  {
    key: "manager",
    email:
      process.env.STAFF_SEED_MANAGER_EMAIL?.trim() ??
      "manager.caribe@tagme.pilot",
    role: "manager",
    displayName: "Gerente General Piloto",
    staffSlug: null,
    supervisorDeptCode: null,
  },
  {
    key: "reception",
    email:
      process.env.STAFF_SEED_RECEPTION_EMAIL?.trim() ??
      "reception.caribe@tagme.pilot",
    role: "staff",
    displayName: "Recepción Piloto",
    staffSlug: "caribe-staff-ana-r",
    supervisorDeptCode: null,
  },
];

async function createInsforgeDb() {
  const { createClient } = await import("@insforge/sdk");
  return createClient({
    baseUrl: requireEnv("INSFORGE_URL"),
    anonKey: requireEnv("INSFORGE_SERVICE_KEY"),
  });
}

async function createAnonAuthClient() {
  const { createClient } = await import("@insforge/sdk");
  return createClient({
    baseUrl: requireEnv("INSFORGE_URL"),
    anonKey: requireEnv("INSFORGE_ANON_KEY"),
  });
}

function pilotPassword(): string {
  return process.env.STAFF_SEED_PILOT_PASSWORD?.trim() ?? "PilotCaribe2026!";
}

async function ensureAuthUser(
  pilot: PilotSpec,
): Promise<{ authUserId: string; created: boolean; verified: boolean }> {
  const password = pilotPassword();
  const existing = findAuthUserByEmail(pilot.email);

  if (existing) {
    if (!existing.email_verified) {
      verifyAuthUserEmail(existing.id);
      console.log(`  ✓ email verificado (SQL): ${pilot.email}`);
    }
    return { authUserId: existing.id, created: false, verified: true };
  }

  const auth = await createAnonAuthClient();
  const { error } = await auth.auth.signUp({
    email: pilot.email,
    password,
    name: pilot.displayName,
  });

  if (error && error.statusCode !== 409) {
    throw new Error(`Auth signUp ${pilot.email}: ${error.message}`);
  }

  const row = findAuthUserByEmail(pilot.email);
  if (!row) {
    throw new Error(
      `Usuario Auth no encontrado tras signUp. Crear manualmente:\n` +
        manualAuthInstructions(pilot),
    );
  }

  if (!row.email_verified) {
    verifyAuthUserEmail(row.id);
  }

  return { authUserId: row.id, created: !existing, verified: true };
}

function manualAuthInstructions(pilot: PilotSpec): string {
  return [
    `  Dashboard InsForge → Auth → Users → Create user`,
    `    Email: ${pilot.email}`,
    `    Password: ${pilotPassword()} (o STAFF_SEED_PILOT_PASSWORD)`,
    `    Marcar email como verificado`,
    `  Luego re-ejecutar: npm run seed:pilot-users`,
  ].join("\n");
}

async function ensureUserProfile(
  db: InsforgeDb,
  authUserId: string,
  venueId: string,
  pilot: PilotSpec,
): Promise<string> {
  const { data: byAuth } = await db.database
    .from("user_profiles")
    .select("id, role, display_name, venue_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (byAuth?.id) {
    const updates: Record<string, unknown> = {};
    if (byAuth.role !== pilot.role) updates.role = pilot.role;
    if (byAuth.display_name !== pilot.displayName) {
      updates.display_name = pilot.displayName;
    }
    if (byAuth.venue_id !== venueId) updates.venue_id = venueId;

    if (Object.keys(updates).length > 0) {
      const { error } = await db.database
        .from("user_profiles")
        .update(updates)
        .eq("id", byAuth.id);
      if (error) throw new Error(`user_profiles update: ${error.message}`);
    }
    return byAuth.id as string;
  }

  const { data, error } = await db.database
    .from("user_profiles")
    .insert([
      {
        auth_user_id: authUserId,
        venue_id: venueId,
        role: pilot.role,
        display_name: pilot.displayName,
      },
    ])
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`user_profiles insert: ${error?.message}`);
  }
  return data.id as string;
}

async function linkStaffMember(
  db: InsforgeDb,
  profileId: string,
  staffSlug: string,
  venueId: string,
): Promise<string> {
  const { data: tag } = await db.database
    .from("staff_nfc_tags")
    .select("staff_member_id, staff_members!inner(id, venue_id, department_id, departments!inner(code))")
    .eq("tag_slug", staffSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!tag?.staff_member_id) {
    throw new Error(
      `staff_nfc_tags no encontrado para slug ${staffSlug}. Ejecute npm run seed:staff primero.`,
    );
  }

  const staffMemberId = tag.staff_member_id as string;

  const { error } = await db.database
    .from("staff_members")
    .update({ user_profile_id: profileId })
    .eq("id", staffMemberId)
    .eq("venue_id", venueId);

  if (error) throw new Error(`staff_members link: ${error.message}`);

  return staffMemberId;
}

async function ensureSupervisorAssignment(
  db: InsforgeDb,
  profileId: string,
  deptCode: string,
  venueId: string,
): Promise<void> {
  const { data: dept } = await db.database
    .from("departments")
    .select("id")
    .eq("venue_id", venueId)
    .eq("code", deptCode)
    .maybeSingle();

  if (!dept?.id) {
    throw new Error(`Departamento ${deptCode} no encontrado en venue`);
  }

  const { data: existing } = await db.database
    .from("supervisor_department_assignments")
    .select("id")
    .eq("user_profile_id", profileId)
    .eq("department_id", dept.id)
    .maybeSingle();

  if (existing?.id) return;

  const { error } = await db.database
    .from("supervisor_department_assignments")
    .insert([{ user_profile_id: profileId, department_id: dept.id }]);

  if (error) {
    throw new Error(`supervisor_department_assignments: ${error.message}`);
  }
}

async function buildSessionForPilot(
  authUserId: string,
  profileId: string,
  pilot: PilotSpec,
  venueId: string,
  staffMemberId: string | null,
): Promise<PilotSession> {
  return {
    userId: authUserId,
    profileId,
    role: pilot.role,
    venueId,
    displayName: pilot.displayName,
    staffMemberId,
  };
}

/** Mirrors lib/auth/session.ts canManageGuestStays() without Next.js imports. */
async function canManageGuestStaysForPilot(
  db: InsforgeDb,
  session: PilotSession,
  venueId: string,
): Promise<boolean> {
  if (session.role === "admin") return true;
  if (session.venueId !== venueId) return false;
  if (session.role === "manager") return true;
  if (session.role === "staff" && session.staffMemberId) {
    const { data } = await db.database
      .from("staff_members")
      .select("id, departments!inner(code)")
      .eq("id", session.staffMemberId)
      .eq("is_active", true)
      .eq("departments.code", "RECEPCION")
      .maybeSingle();
    return Boolean(data?.id);
  }
  return false;
}

async function verifyReceptionCapacity(
  db: InsforgeDb,
  venueId: string,
  pilots: Array<{
    pilot: PilotSpec;
    session: PilotSession;
    staffMemberId: string | null;
  }>,
): Promise<void> {
  console.log("\n--- Verificación canManageGuestStays() ---");

  const reception = pilots.find((p) => p.pilot.key === "reception");
  const supervisor = pilots.find((p) => p.pilot.key === "supervisor");
  const manager = pilots.find((p) => p.pilot.key === "manager");

  if (!reception) throw new Error("Pilot reception no procesado");

  const receptionAllowed = await canManageGuestStaysForPilot(
    db,
    reception.session,
    venueId,
  );
  console.log(
    `  Recepción (${reception.pilot.email}): canManageGuestStays = ${receptionAllowed}`,
  );
  if (!receptionAllowed) {
    throw new Error(
      "FAIL: usuario Recepción debe tener canManageGuestStays() = true",
    );
  }

  if (supervisor) {
    const supAllowed = await canManageGuestStaysForPilot(
      db,
      supervisor.session,
      venueId,
    );
    console.log(
      `  Supervisor HK (${supervisor.pilot.email}): canManageGuestStays = ${supAllowed}`,
    );
    if (supAllowed) {
      console.warn(
        "  ⚠ Supervisor no debería tener capacidad recepción (esperado false)",
      );
    }
  }

  if (manager) {
    const mgrAllowed = await canManageGuestStaysForPilot(
      db,
      manager.session,
      venueId,
    );
    console.log(
      `  Manager (${manager.pilot.email}): canManageGuestStays = ${mgrAllowed}`,
    );
    if (!mgrAllowed) {
      throw new Error("FAIL: manager debe tener canManageGuestStays() = true");
    }
  }

  const { data: receptionStaff } = await db.database
    .from("staff_members")
    .select("id, departments!inner(code)")
    .eq("id", reception.staffMemberId ?? "")
    .maybeSingle();

  const deptCode = (receptionStaff?.departments as { code?: string } | null)
    ?.code;
  console.log(`  staff_member depto code = ${deptCode ?? "N/A"}`);
  if (deptCode !== "RECEPCION") {
    throw new Error(
      `FAIL: recepción staff debe estar en depto RECEPCION, got ${deptCode}`,
    );
  }

  const auth = await createAnonAuthClient();
  const signIn = await auth.auth.signInWithPassword({
    email: reception.pilot.email,
    password: pilotPassword(),
  });
  if (signIn.error) {
    console.warn(
      `  ⚠ Sign-in recepción falló: ${signIn.error.message} (perfiles DB OK; revisar Auth)`,
    );
  } else {
    console.log(`  ✓ Sign-in recepción OK (auth_user_id=${signIn.data?.user?.id})`);
  }

  console.log("  ✓ Verificación recepción completada");
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
      `Venue ${VENUE_SLUG} no encontrado. Ejecute npm run seed primero.`,
    );
  }

  const venueId = venue.id as string;
  console.log(`🏨 Pilot users — ${venue.name}\n`);

  if (VERIFY_ONLY) {
    console.log("Modo --verify-only (sin crear usuarios)\n");
  }

  const processed: Array<{
    pilot: PilotSpec;
    session: PilotSession;
    staffMemberId: string | null;
  }> = [];

  for (const pilot of PILOTS) {
    console.log(`→ ${pilot.displayName} (${pilot.role})`);

    let authUserId: string;
    if (VERIFY_ONLY) {
      const row = findAuthUserByEmail(pilot.email);
      if (!row) {
        console.log(`  ⚠ Sin usuario Auth — omitido en verify-only`);
        continue;
      }
      authUserId = row.id;
    } else {
      try {
        const auth = await ensureAuthUser(pilot);
        authUserId = auth.authUserId;
        console.log(
          `  ✓ Auth user ${auth.created ? "creado" : "existente"}: ${pilot.email}`,
        );
      } catch (err) {
        console.error(`  ✗ ${err instanceof Error ? err.message : err}`);
        console.log(manualAuthInstructions(pilot));
        continue;
      }
    }

    const { data: profileRow } = await db.database
      .from("user_profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    let profileId = profileRow?.id as string | undefined;
    if (!VERIFY_ONLY) {
      profileId = await ensureUserProfile(db, authUserId, venueId, pilot);
      console.log(`  ✓ user_profiles id=${profileId}`);
    } else if (!profileId) {
      console.log(`  ⚠ Sin user_profile — omitido`);
      continue;
    }

    let staffMemberId: string | null = null;
    if (pilot.staffSlug && !VERIFY_ONLY) {
      staffMemberId = await linkStaffMember(
        db,
        profileId!,
        pilot.staffSlug,
        venueId,
      );
      console.log(
        `  ✓ staff_members vinculado (${pilot.staffSlug} → ${staffMemberId})`,
      );
    } else if (pilot.staffSlug && profileId) {
      const { data: sm } = await db.database
        .from("staff_members")
        .select("id")
        .eq("user_profile_id", profileId)
        .eq("is_active", true)
        .maybeSingle();
      staffMemberId = (sm?.id as string) ?? null;
    }

    if (pilot.supervisorDeptCode && !VERIFY_ONLY) {
      await ensureSupervisorAssignment(
        db,
        profileId!,
        pilot.supervisorDeptCode,
        venueId,
      );
      console.log(
        `  ✓ supervisor_department_assignments → ${pilot.supervisorDeptCode}`,
      );
    }

    processed.push({
      pilot,
      session: await buildSessionForPilot(
        authUserId,
        profileId!,
        pilot,
        venueId,
        staffMemberId,
      ),
      staffMemberId,
    });
  }

  if (processed.length > 0) {
    await verifyReceptionCapacity(db, venueId, processed);
  }

  console.log("\n✓ Seed pilot users complete");
  console.log("\nCredenciales piloto (guardar en gestor de secretos local):");
  for (const pilot of PILOTS) {
    console.log(`  ${pilot.role.padEnd(11)} ${pilot.email} / ${pilotPassword()}`);
  }
  console.log(
    "\nSi Auth falla automáticamente: Dashboard InsForge → Auth → Users, crear usuario verificado, luego re-ejecutar npm run seed:pilot-users",
  );
}

main().catch((err: unknown) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
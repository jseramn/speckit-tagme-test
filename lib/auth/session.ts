import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import { createInsforgeSsrClient } from "@/lib/insforge-ssr";
import type { StaffRole } from "@/types/staff";

export type { StaffRole };

export interface StaffSession {
  userId: string;
  profileId: string | null;
  role: StaffRole;
  venueId: string | null;
  venueName: string | null;
  venueSlug: string | null;
  displayName: string;
  staffMemberId: string | null;
}

export class AuthError extends Error {
  constructor(
    public readonly code: "UNAUTHORIZED" | "FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

interface UserProfileRow {
  id: string;
  auth_user_id: string;
  venue_id: string | null;
  role: StaffRole;
  display_name: string;
  venues: { name: string; slug: string } | { name: string; slug: string }[] | null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function resolveStaffMemberId(
  profileId: string | null,
): Promise<string | null> {
  if (!profileId) return null;

  const insforge = createInsforgeServerClient();
  const { data } = await insforge.database
    .from("staff_members")
    .select("id")
    .eq("user_profile_id", profileId)
    .eq("is_active", true)
    .maybeSingle();

  return (data?.id as string) ?? null;
}

async function mapProfile(row: UserProfileRow): Promise<StaffSession> {
  const venue = firstRelation(row.venues);
  const staffMemberId = await resolveStaffMemberId(row.id);
  return {
    userId: row.auth_user_id,
    profileId: row.id,
    role: row.role,
    venueId: row.venue_id,
    venueName: venue?.name ?? null,
    venueSlug: venue?.slug ?? null,
    displayName: row.display_name,
    staffMemberId,
  };
}

async function fetchProfileByAuthUserId(
  authUserId: string,
): Promise<StaffSession | null> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("user_profiles")
    .select(
      `
      id,
      auth_user_id,
      venue_id,
      role,
      display_name,
      venues ( name, slug )
    `,
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error || !data) return null;
  return mapProfile(data as unknown as UserProfileRow);
}

async function devTokenSession(token: string): Promise<StaffSession | null> {
  const expected = process.env.STAFF_DEV_TOKEN?.trim();
  if (!expected || token !== expected) return null;

  const insforge = createInsforgeServerClient();
  const venueSlug = process.env.STAFF_DEV_VENUE_SLUG?.trim() || "hotel-caribe";

  const { data: venue } = await insforge.database
    .from("venues")
    .select("id, name, slug")
    .eq("slug", venueSlug)
    .maybeSingle();

  return {
    userId: "dev-staff",
    profileId: null,
    role: (process.env.STAFF_DEV_ROLE as StaffRole) || "admin",
    venueId: (venue?.id as string) ?? null,
    venueName: (venue?.name as string) ?? "Hotel Caribe (dev)",
    venueSlug: (venue?.slug as string) ?? venueSlug,
    displayName: process.env.STAFF_DEV_NAME?.trim() || "Staff Dev",
    staffMemberId: process.env.STAFF_DEV_STAFF_MEMBER_ID?.trim() || null,
  };
}

function extractBearerToken(
  authHeader: string | null,
): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}

async function sessionFromBearer(): Promise<StaffSession | null> {
  const headerStore = await headers();
  const token = extractBearerToken(headerStore.get("authorization"));
  if (!token) return null;
  return devTokenSession(token);
}

/**
 * Returns the current staff session or null when unauthenticated.
 */
async function devAutoSession(): Promise<StaffSession | null> {
  const token = process.env.STAFF_DEV_TOKEN?.trim();
  if (process.env.NODE_ENV !== "development" || !token) return null;
  return devTokenSession(token);
}

export async function getSession(): Promise<StaffSession | null> {
  const devSession = await sessionFromBearer();
  if (devSession) return devSession;

  const insforge = await createInsforgeSsrClient();
  const { data, error } = await insforge.auth.getCurrentUser();

  if (!error && data?.user?.id) {
    const profile = await fetchProfileByAuthUserId(data.user.id);
    if (profile) return profile;
  }

  return devAutoSession();
}

/**
 * Resolves staff session from an API Route request (cookies + dev Bearer).
 */
export async function getSessionFromRequest(
  request: NextRequest,
): Promise<StaffSession | null> {
  const bearer = extractBearerToken(request.headers.get("authorization"));
  if (bearer) {
    const dev = await devTokenSession(bearer);
    if (dev) return dev;
  }

  const insforge = await createInsforgeSsrClient();
  const { data, error } = await insforge.auth.getCurrentUser();
  if (!error && data?.user?.id) {
    const profile = await fetchProfileByAuthUserId(data.user.id);
    if (profile) return profile;
  }

  return devAutoSession();
}

export function assertVenueAccess(
  session: StaffSession,
  venueId: string,
): void {
  if (session.role === "admin") return;
  if (!session.venueId || session.venueId !== venueId) {
    throw new AuthError("FORBIDDEN", "No tiene acceso a este venue");
  }
}

export async function requireStaff(
  request?: NextRequest,
): Promise<StaffSession> {
  const session = request
    ? await getSessionFromRequest(request)
    : await getSession();

  if (!session) {
    throw new AuthError("UNAUTHORIZED", "Sesión requerida");
  }
  return session;
}

export async function requireAdmin(
  request?: NextRequest,
): Promise<StaffSession> {
  const session = await requireStaff(request);
  if (session.role !== "admin") {
    throw new AuthError("FORBIDDEN", "Se requiere rol admin");
  }
  return session;
}

export async function requireEditor(
  request?: NextRequest,
): Promise<StaffSession> {
  const session = await requireStaff(request);
  if (session.role === "ops") {
    throw new AuthError("FORBIDDEN", "Rol de solo lectura");
  }
  return session;
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json(
      { error: error.code, message: error.message },
      { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
    );
  }
  return null;
}

async function isReceptionStaffMember(staffMemberId: string): Promise<boolean> {
  const insforge = createInsforgeServerClient();
  const { data } = await insforge.database
    .from("staff_members")
    .select("id, departments!inner(code)")
    .eq("id", staffMemberId)
    .eq("is_active", true)
    .eq("departments.code", "RECEPCION")
    .maybeSingle();

  return Boolean(data?.id);
}

/**
 * Capacidad recepción: admin OR manager OR staff_member activo en depto RECEPCION.
 * Spec §Capacidad recepción — alineado a SQL can_manage_guest_stays().
 */
export async function canManageGuestStays(
  session: StaffSession,
  venueId?: string,
): Promise<boolean> {
  if (session.role === "admin") return true;

  const targetVenueId = venueId ?? session.venueId;
  if (!targetVenueId || session.venueId !== targetVenueId) return false;

  if (session.role === "manager") return true;

  if (session.role === "staff" && session.staffMemberId) {
    return isReceptionStaffMember(session.staffMemberId);
  }

  return false;
}

export async function requireSupervisor(
  request?: NextRequest,
): Promise<StaffSession> {
  const session = await requireStaff(request);
  if (session.role !== "supervisor" && session.role !== "admin") {
    throw new AuthError("FORBIDDEN", "Se requiere rol supervisor");
  }
  return session;
}

export async function requireManager(
  request?: NextRequest,
): Promise<StaffSession> {
  const session = await requireStaff(request);
  if (session.role !== "manager" && session.role !== "admin") {
    throw new AuthError("FORBIDDEN", "Se requiere rol manager");
  }
  return session;
}

/** Alias de canManageGuestStays; lanza 403 RECEPTION_REQUIRED si no autorizado. */
export async function requireReception(
  request?: NextRequest,
  venueId?: string,
): Promise<StaffSession> {
  const session = await requireStaff(request);
  const allowed = await canManageGuestStays(session, venueId);
  if (!allowed) {
    throw new AuthError(
      "FORBIDDEN",
      "RECEPTION_REQUIRED: capacidad recepción requerida",
    );
  }
  return session;
}

/** staff_member_id vinculado al usuario autenticado (null si no hay vínculo). */
export async function staffMemberIdForSession(
  session: StaffSession,
): Promise<string | null> {
  if (session.staffMemberId) return session.staffMemberId;
  if (!session.profileId) return null;

  const insforge = createInsforgeServerClient();
  const { data } = await insforge.database
    .from("staff_members")
    .select("id")
    .eq("user_profile_id", session.profileId)
    .eq("is_active", true)
    .maybeSingle();

  return (data?.id as string) ?? null;
}
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import { createInsforgeSsrClient } from "@/lib/insforge-ssr";

export type StaffRole = "staff" | "admin" | "ops";

export type ExecutiveRole = "executive" | "manager" | "department_head";

export type ExecutiveScope =
  | "operations"
  | "fnb"
  | "experience"
  | "front_office";

export interface StaffSession {
  userId: string;
  role: StaffRole;
  venueId: string | null;
  venueName: string | null;
  venueSlug: string | null;
  displayName: string;
}

export interface ExecutiveSession {
  userId: string;
  role: ExecutiveRole;
  executiveScope: ExecutiveScope | null;
  venueId: string | null;
  venueName: string | null;
  venueSlug: string | null;
  displayName: string;
  isExecutive: true;
}

export type AppSession = StaffSession | ExecutiveSession;

const EXECUTIVE_ROLES: ReadonlySet<string> = new Set<ExecutiveRole>([
  "executive",
  "manager",
  "department_head",
]);

const STAFF_ROLES: ReadonlySet<string> = new Set<StaffRole>([
  "staff",
  "admin",
  "ops",
]);

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
  auth_user_id: string;
  venue_id: string | null;
  role: string;
  executive_scope: ExecutiveScope | null;
  display_name: string;
  venues: { name: string; slug: string } | { name: string; slug: string }[] | null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function isExecutiveRole(role: string): role is ExecutiveRole {
  return EXECUTIVE_ROLES.has(role);
}

export function isStaffRole(role: string): role is StaffRole {
  return STAFF_ROLES.has(role);
}

export function isExecutiveSession(
  session: AppSession,
): session is ExecutiveSession {
  return "isExecutive" in session && session.isExecutive === true;
}

function mapStaffProfile(row: UserProfileRow): StaffSession {
  const venue = firstRelation(row.venues);
  return {
    userId: row.auth_user_id,
    role: row.role as StaffRole,
    venueId: row.venue_id,
    venueName: venue?.name ?? null,
    venueSlug: venue?.slug ?? null,
    displayName: row.display_name,
  };
}

function mapExecutiveProfile(row: UserProfileRow): ExecutiveSession {
  const venue = firstRelation(row.venues);
  return {
    userId: row.auth_user_id,
    role: row.role as ExecutiveRole,
    executiveScope: row.executive_scope,
    venueId: row.venue_id,
    venueName: venue?.name ?? null,
    venueSlug: venue?.slug ?? null,
    displayName: row.display_name,
    isExecutive: true,
  };
}

function mapProfile(row: UserProfileRow): AppSession {
  if (isExecutiveRole(row.role)) {
    return mapExecutiveProfile(row);
  }
  return mapStaffProfile(row);
}

async function fetchProfileByAuthUserId(
  authUserId: string,
): Promise<AppSession | null> {
  const insforge = createInsforgeServerClient();

  const { data, error } = await insforge.database
    .from("user_profiles")
    .select(
      `
      auth_user_id,
      venue_id,
      role,
      executive_scope,
      display_name,
      venues ( name, slug )
    `,
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error || !data) return null;
  return mapProfile(data as unknown as UserProfileRow);
}

async function resolveDevVenue(): Promise<{
  id: string | null;
  name: string;
  slug: string;
}> {
  const insforge = createInsforgeServerClient();
  const venueSlug = process.env.STAFF_DEV_VENUE_SLUG?.trim() || "hotel-caribe";

  const { data: venue } = await insforge.database
    .from("venues")
    .select("id, name, slug")
    .eq("slug", venueSlug)
    .maybeSingle();

  return {
    id: (venue?.id as string) ?? null,
    name: (venue?.name as string) ?? "Hotel Caribe (dev)",
    slug: (venue?.slug as string) ?? venueSlug,
  };
}

async function devExecutiveTokenSession(
  token: string,
): Promise<ExecutiveSession | null> {
  const expected = process.env.STAFF_DEV_TOKEN?.trim();
  if (!expected || token !== expected) return null;

  const executiveRole = process.env.STAFF_DEV_EXECUTIVE_ROLE?.trim();
  if (!executiveRole || !isExecutiveRole(executiveRole)) return null;

  const venue = await resolveDevVenue();
  const scopeEnv = process.env.STAFF_DEV_EXECUTIVE_SCOPE?.trim();
  const executiveScope: ExecutiveScope | null =
    executiveRole === "executive"
      ? null
      : scopeEnv && isExecutiveScope(scopeEnv)
        ? scopeEnv
        : executiveRole === "manager"
          ? "operations"
          : "front_office";

  return {
    userId: "00000000-0000-4000-a000-000000000001",
    role: executiveRole,
    executiveScope,
    venueId: venue.id,
    venueName: venue.name,
    venueSlug: venue.slug,
    displayName: process.env.STAFF_DEV_NAME?.trim() || "Executive Dev",
    isExecutive: true,
  };
}

function isExecutiveScope(value: string): value is ExecutiveScope {
  return (
    value === "operations" ||
    value === "fnb" ||
    value === "experience" ||
    value === "front_office"
  );
}

async function devTokenSession(token: string): Promise<AppSession | null> {
  const executiveSession = await devExecutiveTokenSession(token);
  if (executiveSession) return executiveSession;

  const expected = process.env.STAFF_DEV_TOKEN?.trim();
  if (!expected || token !== expected) return null;

  const venue = await resolveDevVenue();

  return {
    userId: "dev-staff",
    role: (process.env.STAFF_DEV_ROLE as StaffRole) || "admin",
    venueId: venue.id,
    venueName: venue.name,
    venueSlug: venue.slug,
    displayName: process.env.STAFF_DEV_NAME?.trim() || "Staff Dev",
  };
}

function extractBearerToken(
  authHeader: string | null,
): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}

async function sessionFromBearer(): Promise<AppSession | null> {
  const headerStore = await headers();
  const token = extractBearerToken(headerStore.get("authorization"));
  if (!token) return null;
  return devTokenSession(token);
}

/**
 * Returns the current session or null when unauthenticated.
 */
async function devAutoSession(): Promise<AppSession | null> {
  const token = process.env.STAFF_DEV_TOKEN?.trim();
  if (process.env.NODE_ENV !== "development" || !token) return null;
  return devTokenSession(token);
}

export async function getSession(): Promise<AppSession | null> {
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
 * Resolves session from an API Route request (cookies + dev Bearer).
 */
export async function getSessionFromRequest(
  request: NextRequest,
): Promise<AppSession | null> {
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
  session: AppSession,
  venueId: string,
): void {
  if (!isExecutiveSession(session) && session.role === "admin") return;
  if (!session.venueId || session.venueId !== venueId) {
    throw new AuthError("FORBIDDEN", "No tiene acceso a este venue");
  }
}

/**
 * Returns true when the session may access /executive routes.
 * Staff and ops are blocked; executive roles are allowed.
 */
export function canAccessExecutiveRoutes(session: AppSession): boolean {
  return isExecutiveSession(session);
}

export function assertExecutiveScope(
  session: ExecutiveSession,
  scope: ExecutiveScope,
): void {
  if (session.role === "executive") return;
  if (session.executiveScope !== scope) {
    throw new AuthError(
      "FORBIDDEN",
      `No tiene acceso al área ${scope}`,
    );
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
  if (isExecutiveSession(session)) {
    throw new AuthError("FORBIDDEN", "Se requiere rol staff");
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

/**
 * Requires an executive-layer session (executive, manager, department_head).
 * Rejects staff, ops, and admin — admin is not an executive role per CL-13.
 */
export async function requireExecutive(
  request?: NextRequest,
): Promise<ExecutiveSession> {
  const session = request
    ? await getSessionFromRequest(request)
    : await getSession();

  if (!session) {
    throw new AuthError("UNAUTHORIZED", "Sesión requerida");
  }
  if (!isExecutiveSession(session)) {
    throw new AuthError("FORBIDDEN", "Se requiere rol gerencial");
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
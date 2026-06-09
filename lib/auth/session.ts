import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import { createInsforgeSsrClient } from "@/lib/insforge-ssr";

export type StaffRole = "staff" | "admin" | "ops";

export interface StaffSession {
  userId: string;
  role: StaffRole;
  venueId: string | null;
  venueName: string | null;
  venueSlug: string | null;
  displayName: string;
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

function mapProfile(row: UserProfileRow): StaffSession {
  const venue = firstRelation(row.venues);
  return {
    userId: row.auth_user_id,
    role: row.role,
    venueId: row.venue_id,
    venueName: venue?.name ?? null,
    venueSlug: venue?.slug ?? null,
    displayName: row.display_name,
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
    role: (process.env.STAFF_DEV_ROLE as StaffRole) || "admin",
    venueId: (venue?.id as string) ?? null,
    venueName: (venue?.name as string) ?? "Hotel Caribe (dev)",
    venueSlug: (venue?.slug as string) ?? venueSlug,
    displayName: process.env.STAFF_DEV_NAME?.trim() || "Staff Dev",
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
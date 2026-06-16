/**
 * Shared conventions for InsForge integration tests.
 * See specs/test-stability/spec.md
 */

/** Pilot venue slug — always seeded before integration runs. */
export const PILOT_VENUE_SLUG = "hotel-caribe";

/**
 * Staff NFC slugs from seed. Assign per spec file to reduce parallel contention:
 * - primary (maria-g): session open, feedback, incident flows
 * - secondary (carlos-p): ephemeral / multi-feedback / E2E isolation
 * - maintenance (roberto-h): supervisor incident workflow (Mantenimiento dept)
 */
export const STAFF_SLUG = {
  primary: "caribe-staff-maria-g",
  secondary: "caribe-staff-carlos-p",
  maintenance: "caribe-staff-roberto-h",
} as const;

/** Timeouts tuned for remote InsForge round-trips under sequential file execution. */
export const INTEGRATION_TIMEOUT = {
  /** openCaptureSession + single submit + 1–2 DB reads */
  captureFlow: 45_000,
  /** formal stay create/close/reuse or consolidation */
  stayFlow: 60_000,
  /** supervisor list + multi-step incident transitions */
  supervisorFlow: 60_000,
  /** session TTL boundary checks */
  sessionTtl: 45_000,
} as const;

let cachedPilotVenueId: string | null = null;

export function uniqueFingerprint(label: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `vitest-${label}-${Date.now()}-${suffix}`;
}

export async function getPilotVenueId(): Promise<string> {
  if (cachedPilotVenueId) return cachedPilotVenueId;

  const { createInsforgeServerClient } = await import("@/lib/insforge-server");
  const insforge = createInsforgeServerClient();
  const { data } = await insforge.database
    .from("venues")
    .select("id")
    .eq("slug", PILOT_VENUE_SLUG)
    .maybeSingle();

  if (!data?.id) {
    throw new Error(
      `Pilot venue "${PILOT_VENUE_SLUG}" not found — run npm run seed first`,
    );
  }

  cachedPilotVenueId = data.id as string;
  return cachedPilotVenueId;
}

export async function openTestSession(input: {
  slug?: string;
  label: string;
  userAgent?: string;
}) {
  const { openCaptureSession } = await import("@/lib/staff/open-capture-session");
  const opened = await openCaptureSession({
    staffTagSlug: input.slug ?? STAFF_SLUG.primary,
    clientFingerprint: uniqueFingerprint(input.label),
    userAgent: input.userAgent,
  });
  if (!opened) {
    throw new Error(`Failed to open capture session for slug ${input.slug ?? STAFF_SLUG.primary}`);
  }
  return opened;
}
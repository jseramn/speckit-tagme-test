import { NextRequest, NextResponse } from "next/server";
import {
  authErrorResponse,
  assertVenueAccess,
  requireExecutive,
} from "@/lib/auth/session";
import { getFullPulse } from "@/lib/executive/queries";
import {
  filterTagsByScope,
  filterZonesByScope,
  type ExecutiveScopeContext,
} from "@/lib/executive/scope";
import {
  pulseQueryParamsSchema,
  pulseResponseSchema,
} from "@/lib/validators/executive";

export async function GET(request: NextRequest) {
  try {
    const session = await requireExecutive(request);
    const params = pulseQueryParamsSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    assertVenueAccess(session, params.venueId);

    const pulse = await getFullPulse(params.venueId, params.windowMin);

    const ctx: ExecutiveScopeContext = {
      role: session.role,
      executiveScope: session.executiveScope,
    };

    const allowedZones = new Set(
      filterZonesByScope(
        pulse.zones.map((z) => z.zone),
        ctx,
      ),
    );

    const filtered = {
      ...pulse,
      zones: pulse.zones.filter((z) => allowedZones.has(z.zone)),
      tags: filterTagsByScope(pulse.tags, ctx),
    };

    const payload = pulseResponseSchema.parse(filtered);

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;

    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Parámetros inválidos" },
      { status: 400 },
    );
  }
}
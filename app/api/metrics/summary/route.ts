import { NextRequest, NextResponse } from "next/server";
import { getMetricsSummary } from "@/lib/analytics/metrics";
import {
  assertVenueAccess,
  authErrorResponse,
  requireStaff,
} from "@/lib/auth/session";
import { metricsSummarySchema } from "@/lib/validators/events";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const venueId = searchParams.get("venueId");

  if (!venueId) {
    return NextResponse.json(
      { error: "MISSING_VENUE", message: "venueId es requerido" },
      { status: 400 },
    );
  }

  try {
    const session = await requireStaff(request);
    assertVenueAccess(session, venueId);

    const summary = await getMetricsSummary({
      venueId,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      tagId: searchParams.get("tagId") ?? undefined,
    });

    const validated = metricsSummarySchema.safeParse(summary);
    if (!validated.success) {
      return NextResponse.json(
        { error: "SCHEMA_ERROR", message: validated.error.flatten() },
        { status: 500 },
      );
    }

    return NextResponse.json(validated.data);
  } catch (err) {
    const authResponse = authErrorResponse(err);
    if (authResponse) return authResponse;

    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: "METRICS_FAILED", message },
      { status: 500 },
    );
  }
}
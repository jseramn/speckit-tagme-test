import { NextRequest, NextResponse } from "next/server";
import { parsePeriod } from "@/lib/scorecards/parse-period";
import { queryHotelScorecard } from "@/lib/scorecards/query-hotel";
import {
  assertVenueAccess,
  authErrorResponse,
  requireManager,
} from "@/lib/auth/session";
import { feedbackSummaryQuerySchema } from "@/lib/validators/scorecards";

export async function GET(request: NextRequest) {
  try {
    const session = await requireManager(request);

    const raw = {
      period: request.nextUrl.searchParams.get("period") ?? undefined,
      venueId: request.nextUrl.searchParams.get("venueId") ?? undefined,
    };

    const parsed = feedbackSummaryQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const venueId = parsed.data.venueId ?? session.venueId;
    if (!venueId) {
      return NextResponse.json(
        { error: "MISSING_VENUE", message: "venueId es requerido" },
        { status: 400 },
      );
    }

    assertVenueAccess(session, venueId);

    const period = parsePeriod(parsed.data.period);
    const result = await queryHotelScorecard(venueId, period);

    if (!result) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Venue no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      venueId,
      period: parsed.data.period,
      npsInternal: result.metrics.npsInternal,
      feedbackCount: result.metrics.feedbackCount,
      openIncidents: result.metrics.openIncidents,
      signalType: "direct_feedback" as const,
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message },
      { status: 500 },
    );
  }
}
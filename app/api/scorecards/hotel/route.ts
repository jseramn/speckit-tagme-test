import { NextRequest, NextResponse } from "next/server";
import { assertHotelScorecardAccess } from "@/lib/scorecards/assert-scorecard-access";
import { mapHotelResponse } from "@/lib/scorecards/map-response";
import { parsePeriod } from "@/lib/scorecards/parse-period";
import { queryHotelScorecard } from "@/lib/scorecards/query-hotel";
import {
  authErrorResponse,
  requireManager,
} from "@/lib/auth/session";
import { scorecardQuerySchema } from "@/lib/validators/scorecards";

export async function GET(request: NextRequest) {
  try {
    const session = await requireManager(request);

    const venueId =
      request.nextUrl.searchParams.get("venueId") ?? session.venueId;

    if (!venueId) {
      return NextResponse.json(
        { error: "MISSING_VENUE", message: "venueId es requerido" },
        { status: 400 },
      );
    }

    const raw = {
      period: request.nextUrl.searchParams.get("period") ?? undefined,
      from: request.nextUrl.searchParams.get("from") ?? undefined,
      to: request.nextUrl.searchParams.get("to") ?? undefined,
    };

    const parsed = scorecardQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    await assertHotelScorecardAccess(session, venueId);

    const period = parsePeriod(
      parsed.data.period,
      parsed.data.from,
      parsed.data.to,
    );

    const result = await queryHotelScorecard(venueId, period);
    if (!result) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Venue no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(mapHotelResponse(result));
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
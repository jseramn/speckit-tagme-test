import { NextRequest, NextResponse } from "next/server";
import {
  authErrorResponse,
  assertVenueAccess,
  requireExecutive,
} from "@/lib/auth/session";
import { calculateRoi } from "@/lib/executive/roi";
import {
  overviewQueryParamsSchema,
  roiSummarySchema,
} from "@/lib/validators/executive";

export async function GET(request: NextRequest) {
  try {
    const session = await requireExecutive(request);
    const params = overviewQueryParamsSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    assertVenueAccess(session, params.venueId);

    const roi = await calculateRoi(
      params.venueId,
      params.period,
      params.from,
      params.to,
    );

    const payload = roiSummarySchema.parse(roi);
    return NextResponse.json(payload);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;

    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Parámetros inválidos" },
      { status: 400 },
    );
  }
}
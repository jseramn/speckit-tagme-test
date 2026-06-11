import { NextRequest, NextResponse } from "next/server";
import {
  assertVenueAccess,
  authErrorResponse,
  requireReception,
} from "@/lib/auth/session";
import { stayErrorResponse } from "@/lib/stays/errors";
import { lookupGuestStayByToken } from "@/lib/stays/lookup-guest-stay";

export async function GET(request: NextRequest) {
  try {
    const stayToken = request.nextUrl.searchParams.get("stayToken")?.trim();
    const venueId = request.nextUrl.searchParams.get("venueId")?.trim();

    if (!stayToken) {
      return NextResponse.json(
        { error: "MISSING_TOKEN", message: "stayToken es requerido" },
        { status: 400 },
      );
    }

    if (!venueId) {
      return NextResponse.json(
        { error: "MISSING_VENUE", message: "venueId es requerido" },
        { status: 400 },
      );
    }

    const session = await requireReception(request, venueId);
    assertVenueAccess(session, venueId);

    const result = await lookupGuestStayByToken(stayToken, venueId);
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const stayResponse = stayErrorResponse(error);
    if (stayResponse) {
      return NextResponse.json(stayResponse.body, {
        status: stayResponse.status,
      });
    }

    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message },
      { status: 500 },
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import {
  assertVenueAccess,
  authErrorResponse,
  requireReception,
} from "@/lib/auth/session";
import { clearStayCookie } from "@/lib/stays/cookie";
import { closeGuestStay } from "@/lib/stays/close-guest-stay";
import { stayErrorResponse } from "@/lib/stays/errors";

interface RouteContext {
  params: Promise<{ stayId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { stayId } = await context.params;
    let body: { venueId?: string } = {};

    try {
      body = (await request.json()) as { venueId?: string };
    } catch {
      body = {};
    }

    const venueId =
      body.venueId?.trim() ||
      request.nextUrl.searchParams.get("venueId")?.trim();

    if (!venueId) {
      return NextResponse.json(
        { error: "MISSING_VENUE", message: "venueId es requerido" },
        { status: 400 },
      );
    }

    const session = await requireReception(request, venueId);
    assertVenueAccess(session, venueId);

    const result = await closeGuestStay(stayId, venueId);

    const response = NextResponse.json(result);
    clearStayCookie(response);
    return response;
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
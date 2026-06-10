import { NextRequest, NextResponse } from "next/server";
import {
  assertVenueAccess,
  authErrorResponse,
  requireReception,
} from "@/lib/auth/session";
import { consolidateStays } from "@/lib/stays/consolidate-stays";
import { setStayCookie } from "@/lib/stays/cookie";
import { stayErrorResponse } from "@/lib/stays/errors";
import { consolidateStayRequestSchema } from "@/lib/validators/guest-stay";
import { createInsforgeServerClient } from "@/lib/insforge-server";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "INVALID_BODY", message: "JSON inválido" },
        { status: 400 },
      );
    }

    const parsed = consolidateStayRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const venueId = request.nextUrl.searchParams.get("venueId")?.trim();
    const bodyVenueId =
      typeof body === "object" &&
      body !== null &&
      "venueId" in body &&
      typeof (body as { venueId?: string }).venueId === "string"
        ? (body as { venueId: string }).venueId.trim()
        : undefined;

    const resolvedVenueId = bodyVenueId || venueId;
    if (!resolvedVenueId) {
      return NextResponse.json(
        { error: "MISSING_VENUE", message: "venueId es requerido" },
        { status: 400 },
      );
    }

    const session = await requireReception(request, resolvedVenueId);
    assertVenueAccess(session, resolvedVenueId);

    const result = await consolidateStays({
      ephemeralStayToken: parsed.data.ephemeralStayToken,
      formalStayId: parsed.data.formalStayId,
      venueId: resolvedVenueId,
      createdByProfileId: session.profileId,
    });

    const insforge = createInsforgeServerClient();
    const { data: formalStay } = await insforge.database
      .from("guest_stays")
      .select("stay_token, expires_at")
      .eq("id", result.formalStayId)
      .maybeSingle();

    const response = NextResponse.json(result);

    if (formalStay?.stay_token && formalStay?.expires_at) {
      setStayCookie(
        response,
        formalStay.stay_token as string,
        formalStay.expires_at as string,
      );
    }

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
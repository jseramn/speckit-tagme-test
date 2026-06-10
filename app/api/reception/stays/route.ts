import { NextRequest, NextResponse } from "next/server";
import {
  assertVenueAccess,
  authErrorResponse,
  requireReception,
} from "@/lib/auth/session";
import { createFormalStay } from "@/lib/stays/create-formal-stay";
import { setStayCookie } from "@/lib/stays/cookie";
import { stayErrorResponse } from "@/lib/stays/errors";
import { createFormalStayRequestSchema } from "@/lib/validators/guest-stay";

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

    const parsed = createFormalStayRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const session = await requireReception(request, parsed.data.venueId);
    assertVenueAccess(session, parsed.data.venueId);

    const stay = await createFormalStay({
      venueId: parsed.data.venueId,
      createdByProfileId: session.profileId,
      ttlDays: parsed.data.ttlDays,
    });

    const response = NextResponse.json(
      {
        stayId: stay.id,
        stayToken: stay.stay_token,
        stayType: stay.stay_type,
        expiresAt: stay.expires_at,
        cookieSet: true,
      },
      { status: 201 },
    );

    setStayCookie(response, stay.stay_token, stay.expires_at);
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
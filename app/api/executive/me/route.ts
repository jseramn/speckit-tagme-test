import { NextRequest, NextResponse } from "next/server";
import { getBaselineStatus } from "@/lib/executive/baseline";
import {
  authErrorResponse,
  requireExecutive,
} from "@/lib/auth/session";
import { executiveMeResponseSchema } from "@/lib/validators/executive";

export async function GET(request: NextRequest) {
  try {
    const session = await requireExecutive(request);

    if (!session.venueId || !session.venueName || !session.venueSlug) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Perfil gerencial sin venue asignado",
        },
        { status: 403 },
      );
    }

    const baseline = await getBaselineStatus(session.venueId);

    const payload = executiveMeResponseSchema.parse({
      userId: session.userId,
      role: session.role,
      executiveScope: session.executiveScope,
      venueId: session.venueId,
      venueName: session.venueName,
      venueSlug: session.venueSlug,
      displayName: session.displayName,
      baselineReady: baseline.ready,
      baselineDay: baseline.firstTouchAt ? baseline.day : null,
      totalTouches: baseline.totalTouches,
      firstTouchAt: baseline.firstTouchAt,
    });

    return NextResponse.json(payload);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;

    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error inesperado" },
      { status: 500 },
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import {
  AuthError,
  authErrorResponse,
  assertVenueAccess,
  requireExecutive,
} from "@/lib/auth/session";
import {
  loadAlertThresholds,
  updateAlertThreshold,
} from "@/lib/executive/settings";
import {
  patchThresholdBodySchema,
  settingsQuerySchema,
  thresholdsListResponseSchema,
} from "@/lib/validators/executive";

export async function GET(request: NextRequest) {
  try {
    const session = await requireExecutive(request);

    if (session.role !== "executive") {
      throw new AuthError(
        "FORBIDDEN",
        "Se requiere rol Gerente General para configuración",
      );
    }

    const params = settingsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    assertVenueAccess(session, params.venueId);

    const thresholds = await loadAlertThresholds(params.venueId);
    const payload = thresholdsListResponseSchema.parse({
      venueId: params.venueId,
      thresholds,
    });

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;

    if (error instanceof Error && error.message === "THRESHOLD_NOT_FOUND") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Umbral no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Parámetros inválidos" },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireExecutive(request);

    if (session.role !== "executive") {
      throw new AuthError(
        "FORBIDDEN",
        "Se requiere rol Gerente General para configuración",
      );
    }

    const body = patchThresholdBodySchema.parse(await request.json());
    assertVenueAccess(session, body.venueId);

    const updated = await updateAlertThreshold(
      body.venueId,
      body.id,
      session.userId,
      body.config as Record<string, unknown>,
      body.isActive,
    );

    return NextResponse.json({ threshold: updated });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;

    if (error instanceof Error && error.message === "THRESHOLD_NOT_FOUND") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Umbral no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Datos inválidos" },
      { status: 400 },
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import {
  AuthError,
  authErrorResponse,
  assertVenueAccess,
  requireExecutive,
} from "@/lib/auth/session";
import { loadKpiTargets, updateKpiTarget } from "@/lib/executive/settings";
import {
  kpiTargetsListResponseSchema,
  patchKpiTargetBodySchema,
  settingsQuerySchema,
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

    const targets = await loadKpiTargets(params.venueId);
    const payload = kpiTargetsListResponseSchema.parse({
      venueId: params.venueId,
      targets,
    });

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;

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

    const body = patchKpiTargetBodySchema.parse(await request.json());
    assertVenueAccess(session, body.venueId);

    const updated = await updateKpiTarget(
      body.venueId,
      body.id,
      session.userId,
      body.targetValue,
      body.comparison,
    );

    return NextResponse.json({ target: updated });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;

    if (error instanceof Error && error.message === "KPI_TARGET_NOT_FOUND") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Meta KPI no encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Datos inválidos" },
      { status: 400 },
    );
  }
}
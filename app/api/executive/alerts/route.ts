import { NextRequest, NextResponse } from "next/server";
import {
  AuthError,
  authErrorResponse,
  assertVenueAccess,
  requireExecutive,
} from "@/lib/auth/session";
import { listExecutiveAlerts } from "@/lib/executive/alerts/queries";
import {
  alertsListQuerySchema,
  alertsListResponseSchema,
} from "@/lib/validators/executive";

export async function GET(request: NextRequest) {
  try {
    const session = await requireExecutive(request);
    const params = alertsListQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    assertVenueAccess(session, params.venueId);

    if (
      session.role !== "executive" &&
      params.department &&
      session.executiveScope &&
      params.department !== session.executiveScope
    ) {
      throw new AuthError(
        "FORBIDDEN",
        "No tiene acceso a alertas de este departamento",
      );
    }

    const departmentFilter =
      session.role === "executive"
        ? params.department
        : (session.executiveScope ?? params.department);

    const alerts = await listExecutiveAlerts({
      venueId: params.venueId,
      status: params.status,
      severity: params.severity,
      department: departmentFilter ?? undefined,
      limit: params.limit,
    });

    const payload = alertsListResponseSchema.parse({
      venueId: params.venueId,
      fetchedAt: new Date().toISOString(),
      alerts,
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
import { NextRequest, NextResponse } from "next/server";
import {
  authErrorResponse,
  requireSupervisorPanel,
} from "@/lib/auth/session";
import { supervisorIncidentErrorResponse } from "@/lib/supervisor/errors";
import { updateIncident } from "@/lib/supervisor/update-incident";
import { patchIncidentRequestSchema } from "@/lib/validators/supervisor-incident";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "JSON inválido" },
      { status: 400 },
    );
  }

  const parsed = patchIncidentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  try {
    const session = await requireSupervisorPanel(request);
    const { id } = await context.params;

    const result = await updateIncident(session, id, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const incidentResponse = supervisorIncidentErrorResponse(error);
    if (incidentResponse) {
      return NextResponse.json(incidentResponse.body, {
        status: incidentResponse.status,
      });
    }

    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message },
      { status: 500 },
    );
  }
}
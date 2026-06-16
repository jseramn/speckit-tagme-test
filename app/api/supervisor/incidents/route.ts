import { NextRequest, NextResponse } from "next/server";
import {
  authErrorResponse,
  requireSupervisorPanel,
} from "@/lib/auth/session";
import { listIncidents } from "@/lib/supervisor/list-incidents";
import { supervisorIncidentErrorResponse } from "@/lib/supervisor/errors";
import { listIncidentsQuerySchema } from "@/lib/validators/supervisor-incident";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSupervisorPanel(request);

    const raw = {
      status: request.nextUrl.searchParams.get("status") ?? undefined,
      departmentId:
        request.nextUrl.searchParams.get("departmentId") ?? undefined,
      category: request.nextUrl.searchParams.get("category") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    };

    const parsed = listIncidentsQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const result = await listIncidents(session, parsed.data);
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
import { NextRequest, NextResponse } from "next/server";
import {
  authErrorResponse,
  requireSupervisorPanel,
} from "@/lib/auth/session";
import { listIncidentCategories } from "@/lib/supervisor/org/venue-settings";
import { supervisorOrgErrorResponse } from "@/lib/supervisor/org-errors";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSupervisorPanel(request);
    const result = await listIncidentCategories(session);
    return NextResponse.json(result);
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    const orgResponse = supervisorOrgErrorResponse(error);
    if (orgResponse) {
      return NextResponse.json(orgResponse.body, { status: orgResponse.status });
    }
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message },
      { status: 500 },
    );
  }
}
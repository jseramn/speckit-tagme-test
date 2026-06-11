import { NextRequest, NextResponse } from "next/server";
import {
  authErrorResponse,
  requireSupervisorPanel,
} from "@/lib/auth/session";
import { createShift, listShifts } from "@/lib/supervisor/org/shifts";
import { supervisorOrgErrorResponse } from "@/lib/supervisor/org-errors";
import {
  listOrgQuerySchema,
  shiftCreateSchema,
} from "@/lib/validators/supervisor-org";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSupervisorPanel(request);
    const raw = {
      departmentId:
        request.nextUrl.searchParams.get("departmentId") ?? undefined,
    };
    const parsed = listOrgQuerySchema.safeParse(raw);
    if (!parsed.success || !parsed.data.departmentId) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: { departmentId: ["departmentId es requerido"] },
        },
        { status: 422 },
      );
    }
    const result = await listShifts(session, parsed.data.departmentId);
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

export async function POST(request: NextRequest) {
  try {
    const session = await requireSupervisorPanel(request);
    const body = await request.json();
    const parsed = shiftCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }
    const item = await createShift(session, parsed.data);
    return NextResponse.json(item, { status: 201 });
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
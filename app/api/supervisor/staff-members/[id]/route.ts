import { NextRequest, NextResponse } from "next/server";
import {
  authErrorResponse,
  requireSupervisorPanel,
} from "@/lib/auth/session";
import { updateStaffMember } from "@/lib/supervisor/org/staff-members";
import { supervisorOrgErrorResponse } from "@/lib/supervisor/org-errors";
import { staffMemberUpdateSchema } from "@/lib/validators/supervisor-org";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSupervisorPanel(request);
    const { id } = await params;
    const body = await request.json();
    const parsed = staffMemberUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }
    const item = await updateStaffMember(session, id, parsed.data);
    return NextResponse.json(item);
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
import { NextRequest, NextResponse } from "next/server";
import {
  authErrorResponse,
  requireSupervisorPanel,
} from "@/lib/auth/session";
import { listFeedbackComments } from "@/lib/supervisor/feedback-comments";
import { supervisorOrgErrorResponse } from "@/lib/supervisor/org-errors";
import { feedbackCommentsQuerySchema } from "@/lib/validators/supervisor-org";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSupervisorPanel(request);
    const raw = {
      departmentId:
        request.nextUrl.searchParams.get("departmentId") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    };
    const parsed = feedbackCommentsQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }
    const result = await listFeedbackComments(session, parsed.data);
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
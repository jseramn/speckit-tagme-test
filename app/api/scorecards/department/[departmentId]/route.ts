import { NextRequest, NextResponse } from "next/server";
import {
  assertDepartmentScorecardAccess,
  canIncludeComments,
} from "@/lib/scorecards/assert-scorecard-access";
import { mapDepartmentResponse } from "@/lib/scorecards/map-response";
import { parsePeriod } from "@/lib/scorecards/parse-period";
import { queryDepartmentScorecard } from "@/lib/scorecards/query-department";
import {
  authErrorResponse,
  requireSupervisorPanel,
} from "@/lib/auth/session";
import { scorecardQuerySchema } from "@/lib/validators/scorecards";

interface RouteParams {
  params: Promise<{ departmentId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSupervisorPanel(request);
    const { departmentId } = await params;

    const raw = {
      period: request.nextUrl.searchParams.get("period") ?? undefined,
      from: request.nextUrl.searchParams.get("from") ?? undefined,
      to: request.nextUrl.searchParams.get("to") ?? undefined,
      includeComments: request.nextUrl.searchParams.get("includeComments") ?? undefined,
    };

    const parsed = scorecardQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    await assertDepartmentScorecardAccess(session, departmentId);

    const period = parsePeriod(
      parsed.data.period,
      parsed.data.from,
      parsed.data.to,
    );

    const includeComments =
      parsed.data.includeComments === true && canIncludeComments(session);

    const result = await queryDepartmentScorecard(departmentId, period, {
      includeComments,
    });

    if (!result) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Departamento no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(mapDepartmentResponse(result));
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message },
      { status: 500 },
    );
  }
}
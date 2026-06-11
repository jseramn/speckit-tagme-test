import { NextRequest, NextResponse } from "next/server";
import {
  assertEmployeeScorecardAccess,
} from "@/lib/scorecards/assert-scorecard-access";
import { mapEmployeeResponse } from "@/lib/scorecards/map-response";
import { parsePeriod } from "@/lib/scorecards/parse-period";
import { queryEmployeeScorecard } from "@/lib/scorecards/query-employee";
import {
  authErrorResponse,
  requireStaff,
} from "@/lib/auth/session";
import { scorecardQuerySchema } from "@/lib/validators/scorecards";

interface RouteParams {
  params: Promise<{ staffMemberId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireStaff(request);
    const { staffMemberId } = await params;

    const raw = {
      period: request.nextUrl.searchParams.get("period") ?? undefined,
      from: request.nextUrl.searchParams.get("from") ?? undefined,
      to: request.nextUrl.searchParams.get("to") ?? undefined,
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

    await assertEmployeeScorecardAccess(session, staffMemberId);

    const period = parsePeriod(
      parsed.data.period,
      parsed.data.from,
      parsed.data.to,
    );

    const result = await queryEmployeeScorecard(staffMemberId, period);
    if (!result) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Empleado no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(mapEmployeeResponse(result));
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
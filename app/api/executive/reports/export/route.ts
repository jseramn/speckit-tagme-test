import { NextRequest, NextResponse } from "next/server";
import {
  AuthError,
  authErrorResponse,
  assertVenueAccess,
  requireExecutive,
} from "@/lib/auth/session";
import { logReportExport } from "@/lib/executive/audit";
import {
  buildWeeklyReportSummary,
  weeklyReportToCsv,
} from "@/lib/executive/reports/weekly-summary";
import { canAccessDashboard } from "@/lib/executive/scope";
import {
  reportExportQuerySchema,
  weeklyReportSummarySchema,
} from "@/lib/validators/executive";

export async function GET(request: NextRequest) {
  try {
    const session = await requireExecutive(request);

    if (!canAccessDashboard({ role: session.role, executiveScope: session.executiveScope }, "reports")) {
      throw new AuthError("FORBIDDEN", "Se requiere rol Gerente General para exportar reportes");
    }

    const params = reportExportQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    assertVenueAccess(session, params.venueId);

    const report = await buildWeeklyReportSummary(
      params.venueId,
      params.period,
      params.from,
      params.to,
    );

    const validated = weeklyReportSummarySchema.parse(report);

    await logReportExport({
      userId: session.userId,
      venueId: params.venueId,
      format: "csv",
      period: params.period,
      from: validated.from,
      to: validated.to,
    });

    if (params.format === "json") {
      return NextResponse.json(validated, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const csv = weeklyReportToCsv(validated);
    const filename = `tagme-reporte-${validated.from}-${validated.to}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;

    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.code === "UNAUTHORIZED" ? 401 : 403 },
      );
    }

    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Parámetros inválidos" },
      { status: 400 },
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import {
  AuthError,
  authErrorResponse,
  assertExecutiveScope,
  assertVenueAccess,
  requireExecutive,
} from "@/lib/auth/session";
import { getDepartmentDashboard } from "@/lib/executive/department";
import type { ExecutiveScope } from "@/types/executive";
import {
  departmentDashboardResponseSchema,
  departmentQueryParamsSchema,
  executiveScopeSchema,
} from "@/lib/validators/executive";

const SHIPPED_SCOPES = new Set<ExecutiveScope>([
  "operations",
  "front_office",
  "fnb",
  "experience",
]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ scope: string }> },
) {
  try {
    const session = await requireExecutive(request);
    const { scope: scopeParam } = await context.params;
    const scope = executiveScopeSchema.parse(scopeParam);

    if (!SHIPPED_SCOPES.has(scope)) {
      throw new AuthError(
        "FORBIDDEN",
        `Dashboard ${scope} no disponible`,
      );
    }

    assertExecutiveScope(session, scope);

    const params = departmentQueryParamsSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    assertVenueAccess(session, params.venueId);

    const dashboard = await getDepartmentDashboard(
      params.venueId,
      scope,
      {
        role: session.role,
        executiveScope: session.executiveScope,
      },
      {
        period: params.period,
        from: params.from,
        to: params.to,
        zone: params.zone,
        tagId: params.tagId,
      },
    );

    const payload = departmentDashboardResponseSchema.parse(dashboard);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
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
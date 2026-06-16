import { NextRequest, NextResponse } from "next/server";
import {
  AuthError,
  authErrorResponse,
  assertVenueAccess,
  requireExecutive,
} from "@/lib/auth/session";
import { getExecutiveOverview } from "@/lib/executive/overview";
import {
  overviewQueryParamsSchema,
  overviewResponseSchema,
} from "@/lib/validators/executive";

export async function GET(request: NextRequest) {
  try {
    const session = await requireExecutive(request);

    if (session.role !== "executive") {
      throw new AuthError(
        "FORBIDDEN",
        "Se requiere rol Gerente General",
      );
    }

    const params = overviewQueryParamsSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    assertVenueAccess(session, params.venueId);

    const overview = await getExecutiveOverview(
      params.venueId,
      params.period,
      params.from,
      params.to,
    );

    const payload = overviewResponseSchema.parse(overview);
    return NextResponse.json(payload);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;

    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Parámetros inválidos" },
      { status: 400 },
    );
  }
}
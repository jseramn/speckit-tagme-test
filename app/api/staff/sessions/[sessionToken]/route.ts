import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/staff/validate-session";
import { readStayTokenFromRequest } from "@/lib/stays/cookie";
import { resolveStayByToken } from "@/lib/stays/resolve-stay-by-token";

interface RouteContext {
  params: Promise<{ sessionToken: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { sessionToken } = await context.params;

  const session = await validateSession(sessionToken);

  if (session.status !== "active") {
    return NextResponse.json(
      {
        status: "expired",
        message: session.message,
      },
      { status: 410 },
    );
  }

  const stayToken = readStayTokenFromRequest(request);
  let stayLinked = false;

  if (stayToken) {
    const stay = await resolveStayByToken(stayToken);
    stayLinked = !!stay && stay.venue_id === session.venueId;
  }

  return NextResponse.json({
    status: "active",
    expiresAt: session.expiresAt,
    secondsRemaining: session.secondsRemaining,
    staff: session.staff,
    stayLinked,
  });
}
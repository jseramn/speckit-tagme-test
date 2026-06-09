import { NextRequest, NextResponse } from "next/server";
import {
  authErrorResponse,
  getSessionFromRequest,
  requireStaff,
} from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const session = await requireStaff(request);

    return NextResponse.json({
      userId: session.userId,
      role: session.role,
      venueId: session.venueId,
      venueName: session.venueName,
      displayName: session.displayName,
    });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;

    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error inesperado" },
      { status: 500 },
    );
  }
}

/** Lightweight session probe for client layouts. */
export async function HEAD(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  return new NextResponse(null, { status: session ? 200 : 401 });
}
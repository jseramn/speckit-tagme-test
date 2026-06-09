import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import {
  assertVenueAccess,
  authErrorResponse,
  requireStaff,
} from "@/lib/auth/session";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireStaff(request);
    const { id } = await context.params;

    const insforge = createInsforgeServerClient();

    const { data: tag, error: lookupError } = await insforge.database
      .from("nfc_tags")
      .select("id, slug, venue_id, is_active")
      .eq("id", id)
      .maybeSingle();

    if (lookupError || !tag) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Tag no encontrado" },
        { status: 404 },
      );
    }

    assertVenueAccess(session, tag.venue_id as string);

    const base =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      request.nextUrl.origin;
    const shortUrl = `${base}/t/${tag.slug as string}?assisted=1`;

    return NextResponse.json({
      shortUrl,
      qrDataUrl: null,
      instructions: "Abra esta URL en el navegador del huésped",
      isActive: tag.is_active as boolean,
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
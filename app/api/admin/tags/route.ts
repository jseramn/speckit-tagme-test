import { NextRequest, NextResponse } from "next/server";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import {
  assertVenueAccess,
  authErrorResponse,
  requireAdmin,
  requireStaff,
} from "@/lib/auth/session";
import { tagCreateSchema } from "@/lib/validators/tags";
import { logContentAudit } from "@/lib/audit/content-audit";

export async function GET(request: NextRequest) {
  try {
    const session = await requireStaff(request);
    const venueId = request.nextUrl.searchParams.get("venueId");

    if (!venueId) {
      return NextResponse.json(
        { error: "MISSING_VENUE", message: "venueId es requerido" },
        { status: 400 },
      );
    }

    assertVenueAccess(session, venueId);

    const insforge = createInsforgeServerClient();
    const { data, error } = await insforge.database
      .from("nfc_tags")
      .select(
        "id, slug, label, zone, room_number, is_active, experience_config_id, created_at",
      )
      .eq("venue_id", venueId)
      .order("slug");

    if (error) {
      return NextResponse.json(
        { error: "QUERY_FAILED", message: error.message },
        { status: 500 },
      );
    }

    const tags = (data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      label: row.label,
      zone: row.zone,
      roomNumber: row.room_number,
      isActive: row.is_active,
      experienceConfigId: row.experience_config_id,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ tags });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;

    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error inesperado" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin(request);
    const body = await request.json();
    const parsed = tagCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Datos inválidos",
          details: parsed.error.flatten(),
        },
        { status: 422 },
      );
    }

    const input = parsed.data;
    assertVenueAccess(session, input.venueId);

    if (input.zone === "room" && !input.roomNumber?.trim()) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "roomNumber requerido para zona room",
        },
        { status: 422 },
      );
    }

    const insforge = createInsforgeServerClient();
    const { data, error } = await insforge.database
      .from("nfc_tags")
      .insert([
        {
          venue_id: input.venueId,
          slug: input.slug,
          label: input.label,
          zone: input.zone,
          room_number: input.zone === "room" ? input.roomNumber : null,
          experience_config_id: input.experienceConfigId,
          is_active: true,
        },
      ])
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "INSERT_FAILED", message: error?.message ?? "Sin datos" },
        { status: 500 },
      );
    }

    await logContentAudit({
      userId: session.userId,
      venueId: input.venueId,
      entity: "nfc_tag",
      entityId: data.id as string,
      action: "create",
      diff: input,
    });

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;

    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error inesperado" },
      { status: 500 },
    );
  }
}
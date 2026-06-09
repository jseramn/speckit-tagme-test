import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import {
  assertVenueAccess,
  authErrorResponse,
  requireEditor,
} from "@/lib/auth/session";
import { tagPatchSchema } from "@/lib/validators/tags";
import { logContentAudit } from "@/lib/audit/content-audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireEditor(request);
    const { id } = await context.params;
    const body = await request.json();
    const parsed = tagPatchSchema.safeParse(body);

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

    const insforge = createInsforgeServerClient();

    const { data: existing, error: lookupError } = await insforge.database
      .from("nfc_tags")
      .select("id, venue_id, slug, zone")
      .eq("id", id)
      .maybeSingle();

    if (lookupError || !existing) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Tag no encontrado" },
        { status: 404 },
      );
    }

    assertVenueAccess(session, existing.venue_id as string);

    const zone = parsed.data.zone ?? (existing.zone as string);
    if (zone === "room" && parsed.data.roomNumber === "") {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "roomNumber requerido para zona room",
        },
        { status: 422 },
      );
    }

    const updatePayload: Record<string, unknown> = {};
    if (parsed.data.label !== undefined) updatePayload.label = parsed.data.label;
    if (parsed.data.zone !== undefined) updatePayload.zone = parsed.data.zone;
    if (parsed.data.roomNumber !== undefined) {
      updatePayload.room_number =
        zone === "room" ? parsed.data.roomNumber : null;
    }
    if (parsed.data.isActive !== undefined) {
      updatePayload.is_active = parsed.data.isActive;
    }
    if (parsed.data.experienceConfigId !== undefined) {
      updatePayload.experience_config_id = parsed.data.experienceConfigId;
    }

    const { error: updateError } = await insforge.database
      .from("nfc_tags")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: "UPDATE_FAILED", message: updateError.message },
        { status: 500 },
      );
    }

    await logContentAudit({
      userId: session.userId,
      venueId: existing.venue_id as string,
      entity: "nfc_tag",
      entityId: id,
      action: "update",
      diff: { before: existing, after: updatePayload },
    });

    revalidatePath(`/t/${existing.slug as string}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;

    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Error inesperado" },
      { status: 500 },
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import {
  assertVenueAccess,
  authErrorResponse,
  requireEditor,
  requireStaff,
} from "@/lib/auth/session";
import {
  experienceUpdateSchema,
  toDbDestinations,
} from "@/lib/validators/experience";
import { logContentAudit } from "@/lib/audit/content-audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function revalidateTagsForExperience(experienceId: string) {
  const insforge = createInsforgeServerClient();
  const { data } = await insforge.database
    .from("nfc_tags")
    .select("slug")
    .eq("experience_config_id", experienceId)
    .eq("is_active", true);

  for (const tag of data ?? []) {
    revalidatePath(`/t/${tag.slug as string}`);
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireStaff(request);
    const { id } = await context.params;

    const insforge = createInsforgeServerClient();
    const { data, error } = await insforge.database
      .from("experience_configs")
      .select("id, venue_id, title, welcome_message, avex_enabled, destinations, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Configuración no encontrada" },
        { status: 404 },
      );
    }

    assertVenueAccess(session, data.venue_id as string);

    return NextResponse.json({
      id: data.id,
      venueId: data.venue_id,
      title: data.title,
      welcomeMessage: data.welcome_message,
      avexEnabled: data.avex_enabled,
      destinations: data.destinations,
      updatedAt: data.updated_at,
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

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireEditor(request);
    const { id } = await context.params;
    const body = await request.json();
    const parsed = experienceUpdateSchema.safeParse(body);

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
      .from("experience_configs")
      .select("id, venue_id, title, welcome_message, avex_enabled, destinations")
      .eq("id", id)
      .maybeSingle();

    if (lookupError || !existing) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Configuración no encontrada" },
        { status: 404 },
      );
    }

    assertVenueAccess(session, existing.venue_id as string);

    const updatePayload = {
      title: parsed.data.title,
      welcome_message: parsed.data.welcomeMessage ?? null,
      avex_enabled: parsed.data.avexEnabled,
      destinations: toDbDestinations(parsed.data.destinations),
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await insforge.database
      .from("experience_configs")
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
      entity: "experience_config",
      entityId: id,
      action: "update",
      diff: {
        before: {
          title: existing.title,
          welcome_message: existing.welcome_message,
          avex_enabled: existing.avex_enabled,
          destinations: existing.destinations,
        },
        after: updatePayload,
      },
    });

    await revalidateTagsForExperience(id);

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
import { NextRequest, NextResponse } from "next/server";
import { logContentAudit } from "@/lib/audit/content-audit";
import {
  assertVenueAccess,
  authErrorResponse,
  requireEditor,
} from "@/lib/auth/session";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import { knowledgeUpdateSchema } from "@/lib/validators/knowledge";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function fetchEntry(id: string) {
  const insforge = createInsforgeServerClient();
  return insforge.database
    .from("knowledge_entries")
    .select("id, venue_id, category, title, content, is_active")
    .eq("id", id)
    .maybeSingle();
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireEditor(request);
    const { id } = await params;
    const body = await request.json();
    const parsed = knowledgeUpdateSchema.safeParse(body);

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

    const { data: existing, error: lookupError } = await fetchEntry(id);
    if (lookupError || !existing) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Entrada no encontrada" },
        { status: 404 },
      );
    }

    assertVenueAccess(session, existing.venue_id as string);

    const patch: Record<string, unknown> = {};
    if (parsed.data.category !== undefined) patch.category = parsed.data.category;
    if (parsed.data.title !== undefined) patch.title = parsed.data.title;
    if (parsed.data.content !== undefined) patch.content = parsed.data.content;
    if (parsed.data.isActive !== undefined) {
      patch.is_active = parsed.data.isActive;
    }

    const insforge = createInsforgeServerClient();
    const { error } = await insforge.database
      .from("knowledge_entries")
      .update(patch)
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "UPDATE_FAILED", message: error.message },
        { status: 500 },
      );
    }

    await logContentAudit({
      userId: session.userId,
      venueId: existing.venue_id as string,
      entity: "knowledge_entry",
      entityId: id,
      action: "update",
      diff: parsed.data as Record<string, unknown>,
    });

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

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireEditor(request);
    const { id } = await params;

    const { data: existing, error: lookupError } = await fetchEntry(id);
    if (lookupError || !existing) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Entrada no encontrada" },
        { status: 404 },
      );
    }

    assertVenueAccess(session, existing.venue_id as string);

    const insforge = createInsforgeServerClient();
    const { error } = await insforge.database
      .from("knowledge_entries")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "DELETE_FAILED", message: error.message },
        { status: 500 },
      );
    }

    await logContentAudit({
      userId: session.userId,
      venueId: existing.venue_id as string,
      entity: "knowledge_entry",
      entityId: id,
      action: "delete",
      diff: { isActive: false },
    });

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
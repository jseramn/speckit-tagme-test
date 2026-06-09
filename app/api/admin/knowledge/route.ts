import { NextRequest, NextResponse } from "next/server";
import { logContentAudit } from "@/lib/audit/content-audit";
import {
  assertVenueAccess,
  authErrorResponse,
  requireEditor,
  requireStaff,
} from "@/lib/auth/session";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import { knowledgeCreateSchema } from "@/lib/validators/knowledge";

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
      .from("knowledge_entries")
      .select("id, category, title, content, is_active, updated_at")
      .eq("venue_id", venueId)
      .order("category")
      .order("title");

    if (error) {
      return NextResponse.json(
        { error: "QUERY_FAILED", message: error.message },
        { status: 500 },
      );
    }

    const entries = (data ?? []).map((row) => ({
      id: row.id,
      category: row.category,
      title: row.title,
      content: row.content,
      isActive: row.is_active,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ entries });
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
    const session = await requireEditor(request);
    const body = await request.json();
    const parsed = knowledgeCreateSchema.safeParse(body);

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

    const insforge = createInsforgeServerClient();
    const { data, error } = await insforge.database
      .from("knowledge_entries")
      .insert([
        {
          venue_id: input.venueId,
          category: input.category,
          title: input.title,
          content: input.content,
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
      entity: "knowledge_entry",
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
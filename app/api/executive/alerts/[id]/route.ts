import { NextRequest, NextResponse } from "next/server";
import {
  authErrorResponse,
  assertVenueAccess,
  requireExecutive,
} from "@/lib/auth/session";
import {
  applyAlertAction,
  getAlertById,
} from "@/lib/executive/alerts/queries";
import {
  executiveAlertSchema,
  patchAlertBodySchema,
} from "@/lib/validators/executive";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireExecutive(request);
    const { id } = await context.params;
    const body = patchAlertBodySchema.parse(await request.json());

    if (body.action === "assign" && !body.assignTo) {
      body.assignTo = session.userId;
    }

    const existing = await getAlertById(id);

    if (!existing) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Alerta no encontrada" },
        { status: 404 },
      );
    }

    assertVenueAccess(session, existing.venueId);

    const alert = await applyAlertAction(
      id,
      body.action,
      session.userId,
      body.assignTo,
    );

    const payload = executiveAlertSchema.parse(alert);
    return NextResponse.json(payload);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;

    if (error instanceof Error && error.message === "ALERT_NOT_FOUND") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Alerta no encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Solicitud inválida" },
      { status: 400 },
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import {
  authErrorResponse,
  assertVenueAccess,
  requireExecutive,
} from "@/lib/auth/session";
import { logContentCorrectionRequest } from "@/lib/executive/audit";
import { contentCorrectionBodySchema } from "@/lib/validators/executive";

export async function POST(request: NextRequest) {
  try {
    const session = await requireExecutive(request);
    const body = contentCorrectionBodySchema.parse(await request.json());

    assertVenueAccess(session, body.venueId);

    await logContentCorrectionRequest({
      userId: session.userId,
      venueId: body.venueId,
      tagId: body.tagId,
      tagLabel: body.tagLabel,
      note: body.note,
    });

    return NextResponse.json({
      ok: true,
      message:
        "Solicitud registrada. El equipo de contenido recibirá seguimiento manual.",
    });
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;

    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Solicitud inválida" },
      { status: 400 },
    );
  }
}
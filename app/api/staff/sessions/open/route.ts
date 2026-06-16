import { NextRequest, NextResponse } from "next/server";
import { openCaptureSession } from "@/lib/staff/open-capture-session";
import { openStaffSessionRequestSchema } from "@/lib/validators/staff-session";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "JSON inválido" },
      { status: 400 },
    );
  }

  const parsed = openStaffSessionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const userAgent = request.headers.get("user-agent");
  const countryCode =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry");

  try {
    const result = await openCaptureSession({
      staffTagSlug: parsed.data.staffTagSlug,
      clientFingerprint: parsed.data.clientFingerprint,
      userAgent,
      countryCode,
    });

    if (!result) {
      return NextResponse.json(
        {
          error: "INVALID_STAFF_TAG",
          message: "Tarjeta no válida o revocada",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: "SESSION_OPEN_FAILED", message },
      { status: 500 },
    );
  }
}
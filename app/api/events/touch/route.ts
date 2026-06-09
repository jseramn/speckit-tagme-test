import { NextRequest, NextResponse } from "next/server";
import { recordTouchEvent } from "@/lib/analytics/track";
import { touchEventRequestSchema } from "@/lib/validators/events";

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

  const parsed = touchEventRequestSchema.safeParse(body);
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

  const assisted = request.nextUrl.searchParams.get("assisted");
  const channel =
    assisted === "1" ? "staff_assisted" : parsed.data.channel;

  const result = await recordTouchEvent({
    tagSlug: parsed.data.tagSlug,
    channel,
    clientFingerprint: parsed.data.clientFingerprint,
    userAgent,
    countryCode,
  });

  if ("code" in result) {
    const status = result.code === "INVALID_TAG" ? 400 : 500;
    return NextResponse.json(
      { error: result.code, message: result.error },
      { status },
    );
  }

  return NextResponse.json(result, { status: 201 });
}
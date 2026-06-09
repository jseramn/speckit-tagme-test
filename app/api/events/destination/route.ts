import { NextRequest, NextResponse } from "next/server";
import { recordDestinationVisit } from "@/lib/analytics/track";
import { destinationVisitRequestSchema } from "@/lib/validators/events";

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

  const parsed = destinationVisitRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const result = await recordDestinationVisit(parsed.data);

  if ("code" in result) {
    const status = result.code === "INVALID_TOUCH" ? 400 : 500;
    return NextResponse.json(
      { error: result.code, message: result.error },
      { status },
    );
  }

  return NextResponse.json(result, { status: 201 });
}
import { NextRequest, NextResponse } from "next/server";
import { captureErrorResponse } from "@/lib/capture/errors";
import { submitFeedback } from "@/lib/capture/submit-feedback";
import { readStayTokenFromRequest, setStayCookie } from "@/lib/stays/cookie";
import { submitFeedbackRequestSchema } from "@/lib/validators/feedback";

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

  const parsed = submitFeedbackRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const stayTokenFromCookie = readStayTokenFromRequest(request);

  try {
    const result = await submitFeedback({
      ...parsed.data,
      stayTokenFromCookie,
    });

    const response = NextResponse.json(
      {
        id: result.id,
        createdAt: result.createdAt,
        message: result.message,
      },
      { status: 201 },
    );

    if (result.stayCreated) {
      setStayCookie(response, result.stay.stay_token, result.stay.expires_at);
    }

    return response;
  } catch (err) {
    const captureResponse = captureErrorResponse(err);
    if (captureResponse) {
      return NextResponse.json(captureResponse.body, {
        status: captureResponse.status,
      });
    }

    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: "FEEDBACK_FAILED", message },
      { status: 500 },
    );
  }
}
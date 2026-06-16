import { NextRequest, NextResponse } from "next/server";
import {
  evaluateAlertsForVenue,
  evaluateAllPilotVenues,
} from "@/lib/executive/alerts/evaluate";

function assertCronAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const headerSecret = request.headers.get("x-cron-secret");
  return headerSecret === secret;
}

async function runEvaluation(venueId?: string) {
  const results = venueId
    ? [await evaluateAlertsForVenue(venueId)]
    : await evaluateAllPilotVenues();

  return NextResponse.json({
    ok: true,
    evaluatedAt: new Date().toISOString(),
    results,
  });
}

async function handleEvaluate(request: NextRequest) {
  if (!assertCronAuth(request)) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "CRON_SECRET inválido" },
      { status: 401 },
    );
  }

  try {
    const venueFromQuery = request.nextUrl.searchParams.get("venueId");
    let venueFromBody: string | undefined;

    if (request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as {
        venueId?: string;
      };
      venueFromBody = body.venueId;
    }

    return await runEvaluation(venueFromQuery ?? venueFromBody);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error en evaluación";
    return NextResponse.json(
      { error: "EVALUATION_FAILED", message },
      { status: 500 },
    );
  }
}

/** Vercel Cron invokes GET; dev script uses POST. */
export async function GET(request: NextRequest) {
  return handleEvaluate(request);
}

export async function POST(request: NextRequest) {
  return handleEvaluate(request);
}
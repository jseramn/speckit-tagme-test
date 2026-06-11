import type { NextRequest, NextResponse } from "next/server";

export const STAY_COOKIE_NAME = "tagme_stay";

/** Reads the stay token from the request cookie jar. */
export function readStayTokenFromRequest(request: NextRequest): string | null {
  const value = request.cookies.get(STAY_COOKIE_NAME)?.value;
  return value?.trim() || null;
}

/** Sets the HttpOnly stay cookie with Max-Age derived from expiresAt. */
export function setStayCookie(
  response: NextResponse,
  stayToken: string,
  expiresAt: string | Date,
): void {
  const expires =
    typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const maxAge = Math.max(
    0,
    Math.floor((expires.getTime() - Date.now()) / 1000),
  );

  response.cookies.set(STAY_COOKIE_NAME, stayToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

/** Clears the stay cookie (checkout / consolidation). */
export function clearStayCookie(response: NextResponse): void {
  response.cookies.set(STAY_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
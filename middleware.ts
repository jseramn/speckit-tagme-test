import { NextResponse, type NextRequest } from "next/server";

const ADMIN_PREFIXES = ["/dashboard", "/tags", "/content"];
const EXECUTIVE_PREFIX = "/executive";

function isProtectedRoute(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function requiresAuth(pathname: string): boolean {
  return (
    isProtectedRoute(pathname, ADMIN_PREFIXES) ||
    pathname === EXECUTIVE_PREFIX ||
    pathname.startsWith(`${EXECUTIVE_PREFIX}/`)
  );
}

function getLoginRedirect(pathname: string, request: NextRequest): NextResponse {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";

  if (pathname === EXECUTIVE_PREFIX || pathname.startsWith(`${EXECUTIVE_PREFIX}/`)) {
    loginUrl.searchParams.set("next", "/executive/overview");
  } else {
    loginUrl.searchParams.set("next", pathname);
  }

  return NextResponse.redirect(loginUrl);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (requiresAuth(pathname)) {
    const hasAccessToken = request.cookies.has("insforge_access_token");
    const hasDevBypass =
      process.env.NODE_ENV === "development" &&
      Boolean(process.env.STAFF_DEV_TOKEN?.trim());

    if (!hasAccessToken && !hasDevBypass) {
      return getLoginRedirect(pathname, request);
    }
  }

  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tags/:path*",
    "/content/:path*",
    "/reception/:path*",
    "/my-scorecard",
    "/incidents/:path*",
    "/scorecards/:path*",
    "/pulse/:path*",
    "/organization/:path*",
  ],
};
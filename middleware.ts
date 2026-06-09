import { NextResponse, type NextRequest } from "next/server";

const ADMIN_PREFIXES = ["/dashboard", "/tags", "/content"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminRoute = ADMIN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isAdminRoute) {
    const hasAccessToken = request.cookies.has("insforge_access_token");
    const hasDevBypass =
      process.env.NODE_ENV === "development" &&
      Boolean(process.env.STAFF_DEV_TOKEN?.trim());

    if (!hasAccessToken && !hasDevBypass) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/tags/:path*", "/content/:path*"],
};
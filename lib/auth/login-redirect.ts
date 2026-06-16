import { headers } from "next/headers";

/** Builds /login?next=… using the request path injected by middleware. */
export async function loginRedirectPath(fallback: string): Promise<string> {
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname")?.trim() || fallback;
  return `/login?next=${encodeURIComponent(pathname)}`;
}
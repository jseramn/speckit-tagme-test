import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { buildServerFingerprint } from "@/lib/staff/build-server-fingerprint";
import { openCaptureSession } from "@/lib/staff/open-capture-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StaffEntryPageProps {
  params: Promise<{ tagSlug: string }>;
}

export default async function StaffEntryPage({ params }: StaffEntryPageProps) {
  const { tagSlug } = await params;
  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent") ?? "unknown";
  const forwardedFor = headerStore.get("x-forwarded-for");
  const clientFingerprint = buildServerFingerprint(userAgent, forwardedFor);

  const session = await openCaptureSession({
    staffTagSlug: tagSlug,
    clientFingerprint,
    userAgent,
    countryCode: headerStore.get("x-vercel-ip-country"),
  });

  if (!session) {
    notFound();
  }

  redirect(session.captureUrl);
}
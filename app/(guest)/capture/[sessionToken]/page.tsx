import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaptureFlow } from "@/components/capture/CaptureFlow";
import { SessionExpired } from "@/components/capture/SessionExpired";
import { listActiveIncidentCategories } from "@/lib/supervisor/incident-routing";
import { validateSession } from "@/lib/staff/validate-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CapturePageProps {
  params: Promise<{ sessionToken: string }>;
}

export async function generateMetadata({
  params,
}: CapturePageProps): Promise<Metadata> {
  const { sessionToken } = await params;
  const session = await validateSession(sessionToken);

  if (session.status !== "active") {
    return { title: "Sesión expirada — TagMe" };
  }

  return {
    title: `Opinión — ${session.staff.displayName} — TagMe`,
    description: "Comparte tu experiencia con el equipo del hotel.",
  };
}

export default async function CapturePage({ params }: CapturePageProps) {
  const { sessionToken } = await params;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      sessionToken,
    )
  ) {
    notFound();
  }

  const session = await validateSession(sessionToken);

  if (session.status !== "active") {
    return <SessionExpired message={session.message} />;
  }

  const categories = await listActiveIncidentCategories(session.venueId);

  return (
    <CaptureFlow
      sessionToken={session.sessionToken}
      expiresAt={session.expiresAt}
      staff={session.staff}
      incidentCategories={categories.map((cat) => ({
        code: cat.code,
        label: cat.label,
        defaultPriority: cat.defaultPriority,
      }))}
    />
  );
}
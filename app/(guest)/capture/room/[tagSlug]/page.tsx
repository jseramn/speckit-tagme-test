import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { RoomCaptureFlow } from "@/components/capture/RoomCaptureFlow";
import { resolveRoomCapture } from "@/lib/capture/resolve-room-capture";
import { resolveTag } from "@/lib/tags/resolve-tag";
import { listActiveIncidentCategories } from "@/lib/supervisor/incident-routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RoomCapturePageProps {
  params: Promise<{ tagSlug: string }>;
}

export async function generateMetadata({
  params,
}: RoomCapturePageProps): Promise<Metadata> {
  const { tagSlug } = await params;
  const payload = await resolveTag(tagSlug);

  if (!payload) {
    return { title: "Tag no encontrado — TagMe" };
  }

  const title = payload.roomContext.isRoom
    ? `Habitación ${payload.roomContext.roomNumber} — TagMe`
    : `${payload.tag.label} — TagMe`;

  return {
    title,
    description: "Comparte tu opinión o reporta un problema durante tu estadía.",
  };
}

export default async function RoomCapturePage({ params }: RoomCapturePageProps) {
  const { tagSlug } = await params;
  const requestHeaders = await headers();

  const payload = await resolveRoomCapture({
    tagSlug,
    userAgent: requestHeaders.get("user-agent"),
    countryCode: requestHeaders.get("x-vercel-ip-country"),
  });

  if (!payload) {
    notFound();
  }

  const categories = await listActiveIncidentCategories(payload.venue.id);

  return (
    <RoomCaptureFlow
      tag={payload.tag}
      venue={payload.venue}
      roomContext={payload.roomContext}
      incidentCategories={categories.map((cat) => ({
        code: cat.code,
        label: cat.label,
        defaultPriority: cat.defaultPriority,
      }))}
    />
  );
}
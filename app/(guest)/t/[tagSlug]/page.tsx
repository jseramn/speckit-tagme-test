import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuestHub } from "@/components/guest/GuestHub";
import { resolveTag } from "@/lib/tags/resolve-tag";

export const revalidate = 60;
export const runtime = "edge";

interface TagPageProps {
  params: Promise<{ tagSlug: string }>;
}

export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const { tagSlug } = await params;
  const payload = await resolveTag(tagSlug);

  if (!payload) {
    return { title: "Tag no encontrado — TagMe" };
  }

  return {
    title: `${payload.experience.title} — TagMe`,
    description:
      payload.experience.welcomeMessage ??
      `Experiencia digital en ${payload.venue.name}`,
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { tagSlug } = await params;
  const payload = await resolveTag(tagSlug);

  if (!payload) {
    notFound();
  }

  return <GuestHub payload={payload} />;
}
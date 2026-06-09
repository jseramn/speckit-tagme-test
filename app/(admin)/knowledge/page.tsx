import { redirect } from "next/navigation";
import {
  KnowledgeEditor,
  type KnowledgeEntryState,
} from "@/components/admin/KnowledgeEditor";
import { resolveVenueIdBySlug } from "@/lib/analytics/metrics";
import { getSession } from "@/lib/auth/session";
import { createInsforgeServerClient } from "@/lib/insforge-server";
import { knowledgeCategories } from "@/lib/validators/knowledge";

export default async function KnowledgePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const venueId =
    session.venueId ?? (await resolveVenueIdBySlug("hotel-caribe"));

  if (!venueId) {
    return (
      <main className="px-5 py-8 sm:px-8">
        <h1 className="text-2xl font-semibold text-tagme-ink">
          Base de conocimiento
        </h1>
        <p className="mt-4 text-tagme-slate">Venue no encontrado.</p>
      </main>
    );
  }

  const insforge = createInsforgeServerClient();
  const { data, error } = await insforge.database
    .from("knowledge_entries")
    .select("id, category, title, content, is_active, updated_at")
    .eq("venue_id", venueId)
    .eq("is_active", true)
    .order("category")
    .order("title");

  const entries: KnowledgeEntryState[] = (data ?? [])
    .filter((row) =>
      knowledgeCategories.includes(
        row.category as (typeof knowledgeCategories)[number],
      ),
    )
    .map((row) => ({
      id: row.id as string,
      category: row.category as KnowledgeEntryState["category"],
      title: row.title as string,
      content: row.content as string,
      isActive: row.is_active as boolean,
      updatedAt: row.updated_at as string,
    }));

  const readOnly = session.role === "ops";

  return (
    <main className="px-5 py-8 sm:px-8">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
          AVEX
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-tagme-ink">
          Base de conocimiento
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-tagme-slate">
          Contenido que AVEX usa para responder preguntas de huéspedes. Sin
          embeddings en MVP — todo el corpus activo se inyecta en el contexto
          del asistente.
        </p>
      </header>

      {error ? (
        <p className="text-sm text-red-700">
          No se pudo cargar la base de conocimiento: {error.message}
        </p>
      ) : (
        <KnowledgeEditor
          venueId={venueId}
          entries={entries}
          readOnly={readOnly}
        />
      )}
    </main>
  );
}
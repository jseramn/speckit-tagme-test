"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { knowledgeCategories } from "@/lib/validators/knowledge";

export interface KnowledgeEntryState {
  id: string;
  category: (typeof knowledgeCategories)[number];
  title: string;
  content: string;
  isActive: boolean;
  updatedAt: string;
}

interface KnowledgeEditorProps {
  venueId: string;
  entries: KnowledgeEntryState[];
  readOnly?: boolean;
  onChanged?: () => void;
}

const CATEGORY_LABELS: Record<(typeof knowledgeCategories)[number], string> = {
  hours: "Horarios",
  amenities: "Amenidades",
  policies: "Políticas",
  room_service: "Servicio habitación",
  faq: "FAQ",
};

function emptyEntry(): Omit<KnowledgeEntryState, "id" | "updatedAt"> {
  return {
    category: "faq",
    title: "",
    content: "",
    isActive: true,
  };
}

export function KnowledgeEditor({
  venueId,
  entries: initialEntries,
  readOnly = false,
  onChanged,
}: KnowledgeEditorProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyEntry());
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function startEdit(entry: KnowledgeEntryState) {
    setEditingId(entry.id);
    setDraft({
      category: entry.category,
      title: entry.title,
      content: entry.content,
      isActive: entry.isActive,
    });
    setIsCreating(false);
    setError(null);
    setSuccess(null);
  }

  function startCreate() {
    setEditingId(null);
    setDraft(emptyEntry());
    setIsCreating(true);
    setError(null);
    setSuccess(null);
  }

  function cancelForm() {
    setEditingId(null);
    setIsCreating(false);
    setDraft(emptyEntry());
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId,
          category: draft.category,
          title: draft.title,
          content: draft.content,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? "Error al crear");
      }

      setSuccess("Entrada creada");
      setIsCreating(false);
      setDraft(emptyEntry());
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/knowledge/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: draft.category,
          title: draft.title,
          content: draft.content,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? "Error al guardar");
      }

      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === editingId
            ? {
                ...entry,
                category: draft.category,
                title: draft.title,
                content: draft.content,
              }
            : entry,
        ),
      );
      setSuccess("Cambios guardados");
      setEditingId(null);
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("¿Desactivar esta entrada de la base de conocimiento?")) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/knowledge/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? "Error al desactivar");
      }

      setEntries((prev) => prev.filter((e) => e.id !== id));
      if (editingId === id) cancelForm();
      setSuccess("Entrada desactivada");
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al desactivar");
    } finally {
      setLoading(false);
    }
  }

  const showForm = isCreating || editingId !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-tagme-slate">
          {entries.length} entradas activas para AVEX
        </p>
        {!readOnly && (
          <Button variant="secondary" onClick={startCreate} disabled={loading}>
            Nueva entrada
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </p>
      )}

      {showForm && !readOnly && (
        <form
          onSubmit={isCreating ? handleCreate : handleUpdate}
          className="rounded-2xl border border-tagme-slate/10 bg-white p-5 shadow-sm"
        >
          <h3 className="text-sm font-semibold text-tagme-ink">
            {isCreating ? "Nueva entrada" : "Editar entrada"}
          </h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-tagme-slate">Categoría</span>
              <select
                value={draft.category}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    category: e.target
                      .value as (typeof knowledgeCategories)[number],
                  }))
                }
                className="mt-1 w-full rounded-xl border border-tagme-slate/15 px-3 py-2.5 text-sm"
              >
                {knowledgeCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm sm:col-span-2">
              <span className="text-tagme-slate">Título</span>
              <Input
                value={draft.title}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
                className="mt-1"
                required
              />
            </label>

            <label className="block text-sm sm:col-span-2">
              <span className="text-tagme-slate">Contenido</span>
              <textarea
                value={draft.content}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, content: e.target.value }))
                }
                rows={5}
                required
                className="mt-1 w-full rounded-xl border border-tagme-slate/15 px-3 py-2.5 text-sm"
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <Button type="submit" loading={loading}>
              {isCreating ? "Crear" : "Guardar"}
            </Button>
            <Button type="button" variant="ghost" onClick={cancelForm}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <ul className="space-y-3">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="rounded-2xl border border-tagme-slate/10 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-medium uppercase tracking-widest text-tagme-gold">
                  {CATEGORY_LABELS[entry.category]}
                </span>
                <h4 className="mt-1 font-medium text-tagme-ink">
                  {entry.title}
                </h4>
                <p className="mt-2 line-clamp-3 text-sm text-tagme-slate">
                  {entry.content}
                </p>
              </div>
              {!readOnly && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="text-xs"
                    onClick={() => startEdit(entry)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="danger"
                    className="text-xs"
                    onClick={() => void handleDeactivate(entry.id)}
                    disabled={loading}
                  >
                    Desactivar
                  </Button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {entries.length === 0 && (
        <p className="text-sm text-tagme-slate">
          Sin entradas activas. AVEX derivará a recepción hasta que agregue
          contenido.
        </p>
      )}
    </div>
  );
}
"use client";

import { useCallback, useEffect, useState } from "react";
import { TagForm, type TagRecord } from "@/components/admin/TagForm";
import { Button } from "@/components/ui/Button";

interface TagsManagerProps {
  venueId: string;
  experienceConfigId: string;
  canCreate: boolean;
}

export function TagsManager({
  venueId,
  experienceConfigId,
  canCreate,
}: TagsManagerProps) {
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TagRecord | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const loadTags = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/tags?venueId=${venueId}`);
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.message ?? "No se pudieron cargar los tags");
        return;
      }

      setTags(payload.tags ?? []);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  async function toggleActive(tag: TagRecord) {
    const response = await fetch(`/api/admin/tags/${tag.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !tag.isActive }),
    });

    if (response.ok) {
      await loadTags();
    }
  }

  function handleSaved() {
    setEditing(null);
    setShowCreate(false);
    void loadTags();
  }

  async function copyFallbackUrl(tag: TagRecord) {
    setCopyError(null);

    try {
      const response = await fetch(`/api/admin/tags/${tag.id}/fallback`);
      const payload = await response.json();

      if (!response.ok) {
        setCopyError(payload.message ?? "No se pudo obtener la URL");
        return;
      }

      await navigator.clipboard.writeText(payload.shortUrl as string);
      setCopiedId(tag.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      setCopyError("Error al copiar la URL");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-tagme-slate">
          {tags.length} tags · {tags.filter((t) => t.isActive).length} activos
        </p>
        {canCreate && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setShowCreate(true);
              setEditing(null);
            }}
          >
            + Nuevo tag
          </Button>
        )}
      </div>

      {loading && (
        <p className="text-sm text-tagme-slate">Cargando tags…</p>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {copyError && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {copyError}
        </p>
      )}

      {(showCreate || editing) && (
        <TagForm
          venueId={venueId}
          experienceConfigId={experienceConfigId}
          tag={editing}
          canCreate={canCreate}
          onSaved={handleSaved}
          onCancel={() => {
            setShowCreate(false);
            setEditing(null);
          }}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-tagme-slate/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-tagme-slate/10 bg-tagme-cream/50 text-xs uppercase tracking-widest text-tagme-slate/60">
            <tr>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Etiqueta</th>
              <th className="px-4 py-3">Zona</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => (
              <tr
                key={tag.id}
                className="border-b border-tagme-slate/5 last:border-0"
              >
                <td className="px-4 py-3 font-mono text-xs">{tag.slug}</td>
                <td className="px-4 py-3">{tag.label}</td>
                <td className="px-4 py-3 capitalize text-tagme-slate">
                  {tag.zone}
                  {tag.roomNumber ? ` · ${tag.roomNumber}` : ""}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={[
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      tag.isActive
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-tagme-cream text-tagme-slate",
                    ].join(" ")}
                  >
                    {tag.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => void copyFallbackUrl(tag)}
                      title="Copiar URL para huésped sin NFC"
                    >
                      {copiedId === tag.id ? "¡Copiado!" : "Copiar URL"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditing(tag);
                        setShowCreate(false);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant={tag.isActive ? "danger" : "secondary"}
                      onClick={() => toggleActive(tag)}
                    >
                      {tag.isActive ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && tags.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-tagme-slate">
            No hay tags registrados.
          </p>
        )}
      </div>
    </div>
  );
}
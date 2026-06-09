"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DestinationEditor,
  type ExperienceConfigState,
} from "@/components/admin/DestinationEditor";
import type { TagZone } from "@/types";

export interface ContentTagOption {
  id: string;
  slug: string;
  label: string;
  zone: TagZone;
  roomNumber: string | null;
  experienceConfigId: string;
}

interface ContentManagerProps {
  tags: ContentTagOption[];
  initialConfig: ExperienceConfigState;
  readOnly?: boolean;
}

function tagOptionLabel(tag: ContentTagOption): string {
  const zone =
    tag.zone === "room" && tag.roomNumber
      ? `Habitación ${tag.roomNumber}`
      : tag.zone;
  return `${tag.slug} — ${zone}`;
}

export function ContentManager({
  tags,
  initialConfig,
  readOnly = false,
}: ContentManagerProps) {
  const [selectedTagId, setSelectedTagId] = useState(tags[0]?.id ?? "");
  const [config, setConfig] = useState<ExperienceConfigState>(initialConfig);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTag = tags.find((t) => t.id === selectedTagId) ?? tags[0];

  const loadConfig = useCallback(async (experienceConfigId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/experience/${experienceConfigId}`);
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.message ?? "No se pudo cargar el contenido");
        return;
      }

      setConfig({
        id: payload.id as string,
        title: payload.title as string,
        welcomeMessage: (payload.welcomeMessage as string | null) ?? null,
        avexEnabled: Boolean(payload.avexEnabled),
        destinations: Array.isArray(payload.destinations)
          ? payload.destinations.map((d: Record<string, unknown>) => ({
              id: String(d.id ?? ""),
              type: d.type as ExperienceConfigState["destinations"][0]["type"],
              label: String(d.label ?? ""),
              url: String(d.url ?? ""),
              icon: String(d.icon ?? "link"),
              isPrimary: Boolean(d.isPrimary ?? d.is_primary ?? false),
            }))
          : [],
      });
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedTag) return;
    void loadConfig(selectedTag.experienceConfigId);
  }, [selectedTag, loadConfig]);

  if (tags.length === 0) {
    return (
      <p className="text-sm text-tagme-slate">
        No hay tags NFC. Cree tags en la sección Tags antes de editar contenido.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-tagme-slate/10 bg-white p-5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-tagme-slate/70">
            Editar contenido por tag
          </span>
          <select
            value={selectedTagId}
            onChange={(e) => setSelectedTagId(e.target.value)}
            className="w-full rounded-xl border border-tagme-slate/15 bg-white px-3.5 py-2.5 text-sm"
          >
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tagOptionLabel(tag)}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-3 text-xs leading-relaxed text-tagme-slate/70">
          Cada tag puede tener su propia configuración de hub (mensaje de bienvenida
          y destinos). Los tags de habitación suelen incluir servicios a la
          habitación como destino principal.
        </p>
      </section>

      {loading && (
        <p className="text-sm text-tagme-slate">Cargando contenido del tag…</p>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {!loading && !error && (
        <DestinationEditor
          key={config.id}
          config={config}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
"use client";

import { useState } from "react";
import type { TagRankingRow } from "@/types/executive";

const ZONE_LABELS: Record<string, string> = {
  lobby: "Lobby",
  room: "Habitación",
  restaurant: "Restaurante",
  bar: "Bar",
  other: "Otro",
};

export interface TagRankingTableProps {
  venueId: string;
  tags: TagRankingRow[];
  showContentCorrection?: boolean;
}

export function TagRankingTable({
  venueId,
  tags,
  showContentCorrection = true,
}: TagRankingTableProps) {
  if (tags.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-tagme-slate/60">
        Sin actividad por tag en el período
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-tagme-slate/10 text-left text-xs uppercase tracking-widest text-tagme-slate/60">
            <th className="pb-3 pr-4 font-medium">#</th>
            <th className="pb-3 pr-4 font-medium">Tag</th>
            <th className="pb-3 pr-4 font-medium">Zona</th>
            <th className="pb-3 pr-4 font-medium text-right">Toques</th>
            {showContentCorrection && (
              <th className="pb-3 font-medium text-right">Acción</th>
            )}
          </tr>
        </thead>
        <tbody>
          {tags.slice(0, 15).map((tag, index) => (
            <tr
              key={tag.tagId}
              className="border-b border-tagme-slate/5 last:border-0"
            >
              <td className="py-3 pr-4 tabular-nums text-tagme-slate/50">
                {index + 1}
              </td>
              <td className="py-3 pr-4">
                <p className="font-medium text-tagme-ink">{tag.label}</p>
                {tag.roomNumber && (
                  <p className="text-xs text-tagme-slate/60">
                    Hab. {tag.roomNumber}
                  </p>
                )}
              </td>
              <td className="py-3 pr-4 text-tagme-slate">
                {ZONE_LABELS[tag.zone] ?? tag.zone}
              </td>
              <td className="py-3 pr-4 text-right tabular-nums font-medium">
                {tag.touches}
              </td>
              {showContentCorrection && (
                <td className="py-3 text-right">
                  <ContentCorrectionButton
                    venueId={venueId}
                    tagId={tag.tagId}
                    tagLabel={tag.label}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContentCorrectionButton({
  venueId,
  tagId,
  tagLabel,
}: {
  venueId: string;
  tagId: string;
  tagLabel: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );

  async function handleRequest() {
    setStatus("loading");
    try {
      const res = await fetch("/api/executive/content-correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, tagId, tagLabel }),
      });
      if (!res.ok) throw new Error("request failed");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <span className="text-xs text-emerald-600">Solicitud enviada</span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleRequest()}
      disabled={status === "loading"}
      className="text-xs text-tagme-gold transition-colors hover:text-tagme-ink disabled:opacity-50"
      title="Registra solicitud manual para el equipo de contenido"
    >
      {status === "loading"
        ? "Enviando…"
        : status === "error"
          ? "Reintentar"
          : "Corregir contenido"}
    </button>
  );
}
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type {
  RoomTagSimulatorItem,
  StaffNfcSimulatorItem,
} from "@/lib/admin/nfc-simulator";

interface NfcSimulatorProps {
  venueName: string;
  staffTags: StaffNfcSimulatorItem[];
  roomTags: RoomTagSimulatorItem[];
}

interface ActionResult {
  status: "idle" | "loading" | "success" | "error";
  message: string;
}

export function NfcSimulator({
  venueName,
  staffTags,
  roomTags,
}: NfcSimulatorProps) {
  const [actionResults, setActionResults] = useState<Record<string, ActionResult>>( {} );
  const [genericError, setGenericError] = useState<string | null>(null);

  function setTagResult(tag: string, result: ActionResult) {
    setActionResults((current) => ({ ...current, [tag]: result }));
  }

  async function openStaffSession(tagSlug: string) {
    setGenericError(null);
    setTagResult(tagSlug, {
      status: "loading",
      message: "Abriendo sesión…",
    });

    try {
      const response = await fetch("/api/staff/sessions/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffTagSlug: tagSlug }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setTagResult(tagSlug, {
          status: "error",
          message: payload.message ?? "No se pudo abrir la sesión",
        });
        return;
      }

      window.open(payload.captureUrl, "_blank");
      setTagResult(tagSlug, {
        status: "success",
        message: "Sesión abierta en nueva pestaña",
      });
    } catch (error) {
      setTagResult(tagSlug, {
        status: "error",
        message: error instanceof Error ? error.message : "Error de red",
      });
    }
  }

  function openRoomCapture(tagSlug: string) {
    window.open(`/capture/room/${tagSlug}`, "_blank");
    setTagResult(tagSlug, {
      status: "success",
      message: "Apertura de habitación en nueva pestaña",
    });
  }

  async function copyToClipboard(text: string, tag: string) {
    try {
      await navigator.clipboard.writeText(text);
      setTagResult(tag, {
        status: "success",
        message: "URL copiada",
      });
    } catch {
      setTagResult(tag, {
        status: "error",
        message: "Error al copiar la URL",
      });
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-tagme-slate/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
              Simulador NFC
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-tagme-ink">
              {venueName}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-tagme-slate">
              Abre tarjetas staff y tags de habitación en una nueva pestaña para la
demo sin tocar el hardware.
            </p>
          </div>
          <div className="rounded-2xl border border-tagme-cream/80 bg-tagme-cream/50 px-4 py-3 text-sm text-tagme-ink">
            <p className="font-medium">Modo demo</p>
            <p className="mt-1 text-tagme-slate">
              Las acciones usan los flujos reales de captura que se ejecutan en la app.
            </p>
          </div>
        </div>
      </section>

      {genericError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {genericError}
        </div>
      )}

      <section className="rounded-3xl border border-tagme-slate/10 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
              Tarjetas staff NFC
            </p>
            <h2 className="mt-2 text-xl font-semibold text-tagme-ink">
              {staffTags.length} tarjetas activas
            </h2>
          </div>
          <p className="text-sm text-tagme-slate">
            Estas tarjetas simulan el flujo <span className="font-mono">/s/[tagSlug]</span>.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-tagme-slate/10">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-tagme-slate/10 bg-tagme-cream/50 text-xs uppercase tracking-widest text-tagme-slate/60">
              <tr>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Staff</th>
                <th className="px-4 py-3">Departamento</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {staffTags.map((tag) => {
                const result = actionResults[tag.tagSlug];
                return (
                  <tr
                    key={tag.tagId}
                    className="border-b border-tagme-slate/5 last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{tag.tagSlug}</td>
                    <td className="px-4 py-3">{tag.staffName}</td>
                    <td className="px-4 py-3">{tag.departmentName}</td>
                    <td className="px-4 py-3">{tag.jobRoleTitle}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => openStaffSession(tag.tagSlug)}
                        >
                          Abrir sesión
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            copyToClipboard(
                              `${window.location.origin}/s/${tag.tagSlug}`,
                              tag.tagSlug,
                            )
                          }
                        >
                          Copiar URL
                        </Button>
                      </div>
                      {result && (
                        <p
                          className={
                            result.status === "error"
                              ? "mt-2 text-sm text-red-700"
                              : "mt-2 text-sm text-emerald-700"
                          }
                        >
                          {result.message}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {staffTags.length === 0 && (
          <p className="mt-4 text-sm text-tagme-slate">
            No se encontraron tarjetas staff activas para este venue.
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-tagme-slate/10 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
              Tags de habitación
            </p>
            <h2 className="mt-2 text-xl font-semibold text-tagme-ink">
              {roomTags.length} tags de habitación activos
            </h2>
          </div>
          <p className="text-sm text-tagme-slate">
            Estas entradas simulan el flujo <span className="font-mono">/capture/room/[tagSlug]</span>.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-tagme-slate/10">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-tagme-slate/10 bg-tagme-cream/50 text-xs uppercase tracking-widest text-tagme-slate/60">
              <tr>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Etiqueta</th>
                <th className="px-4 py-3">Hab.</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {roomTags.map((tag) => {
                const result = actionResults[tag.slug];
                return (
                  <tr
                    key={tag.id}
                    className="border-b border-tagme-slate/5 last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{tag.slug}</td>
                    <td className="px-4 py-3">{tag.label}</td>
                    <td className="px-4 py-3">{tag.roomNumber ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => openRoomCapture(tag.slug)}
                        >
                          Abrir captura
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            copyToClipboard(
                              `${window.location.origin}/capture/room/${tag.slug}`,
                              tag.slug,
                            )
                          }
                        >
                          Copiar URL
                        </Button>
                      </div>
                      {result && (
                        <p
                          className={
                            result.status === "error"
                              ? "mt-2 text-sm text-red-700"
                              : "mt-2 text-sm text-emerald-700"
                          }
                        >
                          {result.message}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {roomTags.length === 0 && (
          <p className="mt-4 text-sm text-tagme-slate">
            No se encontraron tags de habitación activas para este venue.
          </p>
        )}
      </section>
    </div>
  );
}

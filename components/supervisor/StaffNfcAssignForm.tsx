"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface StaffNfcAssignFormProps {
  staffMemberId: string;
  staffDisplayName: string;
  currentTagSlug: string | null;
  onAssigned?: (tagSlug: string) => void;
}

export function StaffNfcAssignForm({
  staffMemberId,
  staffDisplayName,
  currentTagSlug,
  onAssigned,
}: StaffNfcAssignFormProps) {
  const [tagSlug, setTagSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/supervisor/staff-members/${staffMemberId}/nfc-tag`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagSlug: tagSlug.trim() }),
        },
      );

      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        tagSlug?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Error al asignar tarjeta NFC");
      }

      const assigned = payload?.tagSlug ?? tagSlug.trim();
      setSuccess(`Tarjeta asignada: /s/${assigned}`);
      setTagSlug("");
      onAssigned?.(assigned);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white p-5 ring-1 ring-tagme-slate/10"
    >
      <h3 className="text-sm font-semibold text-tagme-ink">
        Tarjeta NFC — {staffDisplayName}
      </h3>
      {currentTagSlug ? (
        <p className="mt-1 text-xs text-tagme-slate">
          Activa:{" "}
          <code className="rounded bg-tagme-cream px-1.5 py-0.5">
            /s/{currentTagSlug}
          </code>
        </p>
      ) : (
        <p className="mt-1 text-xs text-amber-700">
          Sin tarjeta activa — asigne un slug antes del piloto.
        </p>
      )}

      <label className="mt-4 block text-xs font-medium text-tagme-slate">
        Nuevo slug (minúsculas, guiones)
        <input
          type="text"
          value={tagSlug}
          onChange={(e) => setTagSlug(e.target.value)}
          placeholder="caribe-staff-nombre-a"
          pattern="[a-z0-9-]+"
          required
          className="mt-1 w-full rounded-xl border border-tagme-slate/20 px-3 py-2 text-sm text-tagme-ink focus:border-tagme-gold focus:outline-none"
        />
      </label>

      {error ? (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      ) : null}
      {success ? (
        <p className="mt-3 text-sm text-emerald-700">{success}</p>
      ) : null}

      <Button
        type="submit"
        disabled={loading || !tagSlug.trim()}
        className="mt-4"
      >
        {loading ? "Asignando…" : "Asignar / reemplazar tarjeta"}
      </Button>
      <p className="mt-2 text-[11px] text-tagme-slate/60">
        Al asignar una nueva tarjeta, la anterior se revoca automáticamente.
      </p>
    </form>
  );
}
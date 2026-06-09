"use client";

import { FormEvent, useEffect, useState } from "react";
import type { TagZone } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface TagRecord {
  id: string;
  slug: string;
  label: string;
  zone: TagZone;
  roomNumber: string | null;
  isActive: boolean;
  experienceConfigId: string;
}

interface TagFormProps {
  venueId: string;
  experienceConfigId: string;
  tag?: TagRecord | null;
  canCreate: boolean;
  onSaved: () => void;
  onCancel: () => void;
}

const ZONES: TagZone[] = ["lobby", "room", "restaurant", "bar", "other"];

export function TagForm({
  venueId,
  experienceConfigId,
  tag,
  canCreate,
  onSaved,
  onCancel,
}: TagFormProps) {
  const isEdit = Boolean(tag);
  const [slug, setSlug] = useState(tag?.slug ?? "");
  const [label, setLabel] = useState(tag?.label ?? "");
  const [zone, setZone] = useState<TagZone>(tag?.zone ?? "lobby");
  const [roomNumber, setRoomNumber] = useState(tag?.roomNumber ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tag) {
      setSlug(tag.slug);
      setLabel(tag.label);
      setZone(tag.zone);
      setRoomNumber(tag.roomNumber ?? "");
    }
  }, [tag]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isEdit && tag) {
        const response = await fetch(`/api/admin/tags/${tag.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label,
            zone,
            roomNumber: zone === "room" ? roomNumber : null,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          setError(payload.message ?? "No se pudo actualizar el tag");
          return;
        }
      } else {
        if (!canCreate) {
          setError("Solo admin puede crear tags");
          return;
        }

        const response = await fetch("/api/admin/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            venueId,
            slug,
            label,
            zone,
            roomNumber: zone === "room" ? roomNumber : null,
            experienceConfigId,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          setError(payload.message ?? "No se pudo crear el tag");
          return;
        }
      }

      onSaved();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-tagme-slate/10 bg-white p-5"
    >
      <h3 className="text-sm font-medium text-tagme-ink">
        {isEdit ? "Editar tag" : "Nuevo tag NFC"}
      </h3>

      {!isEdit && (
        <Input
          label="Slug (URL)"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          placeholder="caribe-room-501"
          required
        />
      )}

      {isEdit && (
        <div>
          <p className="text-xs uppercase tracking-widest text-tagme-slate/60">
            Slug
          </p>
          <p className="mt-1 font-mono text-sm text-tagme-ink">{slug}</p>
        </div>
      )}

      <Input
        label="Etiqueta"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        required
      />

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-tagme-slate/70">
          Zona
        </span>
        <select
          value={zone}
          onChange={(e) => setZone(e.target.value as TagZone)}
          className="w-full rounded-xl border border-tagme-slate/15 bg-white px-3.5 py-2.5 text-sm"
        >
          {ZONES.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </label>

      {zone === "room" && (
        <div>
          <Input
            label="Número de habitación"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            placeholder="412"
            required
          />
          <p className="mt-2 text-xs leading-relaxed text-tagme-slate/70">
            Identificación ligera Q3=B: el número se muestra en el hub del huésped
            (ej. &quot;Bienvenido a la habitación 412&quot;) y se registra en
            métricas. No requiere PMS ni datos del huésped. Use el mismo número
            en el slug cuando sea posible (ej.{" "}
            <span className="font-mono">caribe-room-412</span>).
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" loading={loading}>
          {isEdit ? "Guardar" : "Crear tag"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
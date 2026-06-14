"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface TagFilterOption {
  id: string;
  slug: string;
  label: string;
}

interface DashboardFiltersProps {
  defaultFrom: string;
  defaultTo: string;
  tags?: TagFilterOption[];
  selectedTagId?: string;
}

export function DashboardFilters({
  defaultFrom,
  defaultTo,
  tags = [],
  selectedTagId,
}: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [from, setFrom] = useState(searchParams.get("from") ?? defaultFrom);
  const [to, setTo] = useState(searchParams.get("to") ?? defaultTo);
  const [tagId, setTagId] = useState(
    searchParams.get("tagId") ?? selectedTagId ?? "",
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);
    if (tagId) {
      params.set("tagId", tagId);
    }
    router.replace(`/dashboard?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-tagme-slate/10 bg-white p-4"
    >
      {tags.length > 0 && (
        <div className="flex min-w-[180px] flex-col gap-1">
          <label
            htmlFor="tag-filter"
            className="text-xs font-medium uppercase tracking-widest text-tagme-slate/60"
          >
            Tag NFC
          </label>
          <select
            id="tag-filter"
            value={tagId}
            onChange={(e) => setTagId(e.target.value)}
            className="rounded-xl border border-tagme-slate/15 bg-tagme-cream/50 px-3 py-2.5 text-sm text-tagme-ink focus:border-tagme-gold/50 focus:outline-none focus:ring-1 focus:ring-tagme-gold/30"
          >
            <option value="">Todos los tags</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.label} ({tag.slug})
              </option>
            ))}
          </select>
        </div>
      )}
      <Input
        label="Desde"
        type="date"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
      />
      <Input
        label="Hasta"
        type="date"
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />
      <Button type="submit" variant="secondary">
        Aplicar
      </Button>
    </form>
  );
}
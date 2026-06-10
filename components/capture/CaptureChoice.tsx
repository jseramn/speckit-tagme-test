"use client";

import { Button } from "@/components/ui/Button";

export interface CaptureChoiceProps {
  onSelectFeedback: () => void;
  disabled?: boolean;
}

export function CaptureChoice({
  onSelectFeedback,
  disabled = false,
}: CaptureChoiceProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-tagme-slate/80">
        ¿Cómo fue tu experiencia con nuestro equipo?
      </p>

      <Button
        type="button"
        variant="primary"
        className="h-auto w-full flex-col items-start gap-1 px-5 py-4 text-left"
        onClick={onSelectFeedback}
        disabled={disabled}
      >
        <span className="text-base font-semibold">Feedback</span>
        <span className="text-xs font-normal text-tagme-cream/80">
          Califica la atención recibida
        </span>
      </Button>

      <button
        type="button"
        disabled
        aria-disabled="true"
        className="w-full rounded-xl border border-tagme-slate/10 bg-white/50 px-5 py-4 text-left opacity-60"
      >
        <span className="block text-base font-semibold text-tagme-ink">
          Incidencia
        </span>
        <span className="mt-1 block text-xs text-tagme-slate/60">
          Próximamente
        </span>
      </button>
    </div>
  );
}
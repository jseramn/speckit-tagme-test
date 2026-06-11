"use client";

import { Button } from "@/components/ui/Button";

export interface CaptureChoiceProps {
  onSelectFeedback: () => void;
  onSelectIncident: () => void;
  disabled?: boolean;
  variant?: "staff" | "room";
}

export function CaptureChoice({
  onSelectFeedback,
  onSelectIncident,
  disabled = false,
  variant = "staff",
}: CaptureChoiceProps) {
  const prompt =
    variant === "room"
      ? "¿Cómo fue tu experiencia en el hotel?"
      : "¿Cómo fue tu experiencia con nuestro equipo?";

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-tagme-slate/80">{prompt}</p>

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

      <Button
        type="button"
        variant="secondary"
        className="h-auto w-full flex-col items-start gap-1 px-5 py-4 text-left"
        onClick={onSelectIncident}
        disabled={disabled}
      >
        <span className="text-base font-semibold">Incidencia</span>
        <span className="text-xs font-normal text-tagme-slate/70">
          Reporta un problema que requiere atención del hotel
        </span>
      </Button>
    </div>
  );
}
export interface CaptureConfirmationProps {
  message?: string;
}

export function CaptureConfirmation({
  message = "¡Gracias por tu opinión!",
}: CaptureConfirmationProps) {
  return (
    <div className="rounded-2xl border border-tagme-gold/20 bg-white/80 px-6 py-8 text-center">
      <div
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-tagme-gold/15 text-2xl"
        aria-hidden="true"
      >
        ✓
      </div>
      <h2 className="text-xl font-semibold text-tagme-ink">{message}</h2>
      <p className="mt-3 text-sm leading-relaxed text-tagme-slate/75">
        Tu comentario nos ayuda a mejorar la experiencia en el hotel.
      </p>
    </div>
  );
}
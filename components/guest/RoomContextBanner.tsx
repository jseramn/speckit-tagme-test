import type { RoomContext } from "@/lib/tags/room-context";

export interface RoomContextBannerProps {
  roomContext: RoomContext;
  tagLabel?: string;
}

export function RoomContextBanner({
  roomContext,
  tagLabel,
}: RoomContextBannerProps) {
  if (!roomContext.isRoom || !roomContext.welcomeHeadline) {
    return null;
  }

  return (
    <section
      aria-label={roomContext.displayLabel}
      className="mb-6 overflow-hidden rounded-2xl border border-tagme-gold/25 bg-gradient-to-br from-white via-white to-tagme-gold/8 shadow-sm"
    >
      <div className="border-b border-tagme-gold/15 px-5 py-3">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-tagme-gold">
          Su estancia
        </p>
      </div>
      <div className="px-5 py-4">
        <h2 className="font-sans text-xl font-semibold leading-snug text-tagme-ink">
          {roomContext.welcomeHeadline}
        </h2>
        {tagLabel && (
          <p
            data-testid="guest-room-label"
            className="mt-1.5 text-sm text-tagme-slate/70"
          >
            {tagLabel}
          </p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-tagme-slate/80">
          Room service 24 horas, WiFi y amenidades a un toque. Recepción disponible
          para cualquier solicitud.
        </p>
      </div>
    </section>
  );
}
import type { VenueContact } from "@/types";
import { Button } from "@/components/ui/Button";

export interface AvexEscalationProps {
  reason: string;
  contact: VenueContact;
}

export function AvexEscalation({ reason, contact }: AvexEscalationProps) {
  const phoneHref = contact.phone
    ? `tel:${contact.phone.replace(/\s/g, "")}`
    : null;
  const whatsappHref = contact.whatsapp
    ? `https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`
    : null;

  return (
    <div className="rounded-2xl border border-tagme-gold/25 bg-tagme-gold/5 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-tagme-gold">
        Contactar al equipo
      </p>
      <p className="mt-2 text-sm leading-relaxed text-tagme-ink">{reason}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {phoneHref && (
          <Button
            variant="secondary"
            className="text-xs"
            onClick={() => window.location.assign(phoneHref)}
          >
            Llamar recepción
          </Button>
        )}
        {whatsappHref && (
          <Button
            variant="secondary"
            className="text-xs"
            onClick={() =>
              window.open(whatsappHref, "_blank", "noopener,noreferrer")
            }
          >
            WhatsApp
          </Button>
        )}
      </div>
    </div>
  );
}
"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  resolveTouchChannel,
  trackDestination,
  useTouchTracking,
} from "@/lib/analytics/client-track";
import {
  isExternalDestination,
  isValidDestinationUrl,
} from "@/lib/analytics/destination-utils";
import type { Destination, GuestHubPayload, TagZone } from "@/types";
import { AvexChat } from "@/components/avex/AvexChat";
import { DestinationCard } from "./DestinationCard";
import { RoomContextBanner } from "./RoomContextBanner";

const ZONE_LABELS: Record<TagZone, string> = {
  lobby: "Lobby",
  room: "Habitación",
  restaurant: "Restaurante",
  bar: "Bar",
  other: "Zona",
};

function zoneLabel(zone: TagZone, roomNumber: string | null): string {
  if (zone === "room" && roomNumber) {
    return `Habitación ${roomNumber}`;
  }
  return ZONE_LABELS[zone];
}

export interface GuestHubProps {
  payload: GuestHubPayload;
}

export function GuestHub({ payload }: GuestHubProps) {
  const { venue, tag, experience, contact, roomContext } = payload;
  const touchChannel = resolveTouchChannel();
  const { touchEventId } = useTouchTracking(tag.slug, touchChannel);
  const [navError, setNavError] = useState<string | null>(null);

  const sortedDestinations = [...experience.destinations].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return 0;
  });

  const handleDestinationNavigate = useCallback(
    async (dest: Destination) => {
      setNavError(null);

      if (!isValidDestinationUrl(dest.url)) {
        setNavError(`No pudimos abrir "${dest.label}". Enlace no válido.`);
        return;
      }

      if (touchEventId) {
        const tracked = await trackDestination({
          touchEventId,
          destinationType: dest.type,
          destinationUrl: dest.url,
        });

        if (!tracked) {
          setNavError(
            `No pudimos registrar la visita a "${dest.label}", pero puedes continuar.`,
          );
        }
      }

      const external = isExternalDestination(dest.url, dest.type);

      if (external) {
        const opened = window.open(dest.url, "_blank", "noopener,noreferrer");
        if (!opened) {
          setNavError(
            `El navegador bloqueó la ventana. Toca de nuevo o copia el enlace de ${dest.label}.`,
          );
        }
      } else {
        window.location.assign(dest.url);
      }
    },
    [touchEventId],
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-8">
      {roomContext.isRoom ? (
        <RoomContextBanner roomContext={roomContext} tagLabel={tag.label} />
      ) : null}

      <header className="mb-8">
        {!roomContext.isRoom && (
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
            {zoneLabel(tag.zone, tag.roomNumber)}
          </p>
        )}
        <h1
          className={[
            "font-sans text-2xl font-semibold leading-tight text-tagme-ink",
            roomContext.isRoom ? "" : "mt-2",
          ].join(" ")}
        >
          {experience.title}
        </h1>
        {experience.welcomeMessage && (
          <p className="mt-3 text-sm leading-relaxed text-tagme-slate/80">
            {experience.welcomeMessage}
          </p>
        )}
      </header>

      <section className="mb-8">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-tagme-slate/60">
          Tu estadía
        </h2>
        <ul className="flex flex-col gap-3">
          <li>
            <Link
              href={`/capture/room/${tag.slug}`}
              className="flex w-full flex-col rounded-xl border border-tagme-gold/30 bg-tagme-gold/10 px-5 py-4 text-left transition-colors hover:border-tagme-gold/50 hover:bg-tagme-gold/15"
            >
              <span className="text-base font-semibold text-tagme-ink">
                Dejar opinión
              </span>
              <span className="mt-1 text-xs text-tagme-slate/70">
                Califica tu experiencia en el hotel
              </span>
            </Link>
          </li>
          <li>
            <Link
              href={`/capture/room/${tag.slug}`}
              className="flex w-full flex-col rounded-xl border border-tagme-slate/15 bg-white px-5 py-4 text-left transition-colors hover:border-tagme-gold/40"
            >
              <span className="text-base font-semibold text-tagme-ink">
                Reportar problema
              </span>
              <span className="mt-1 text-xs text-tagme-slate/70">
                Incidencia que requiere atención del equipo
              </span>
            </Link>
          </li>
        </ul>
      </section>

      <section className="flex-1">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-tagme-slate/60">
          Explorar
        </h2>

        {navError && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {navError}
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {sortedDestinations.map((dest) => (
            <li key={dest.id}>
              <DestinationCard
                label={dest.label}
                icon={dest.icon}
                url={dest.url}
                type={dest.type}
                isPrimary={dest.isPrimary}
                isExternal={isExternalDestination(dest.url, dest.type)}
                onNavigate={() => handleDestinationNavigate(dest)}
              />
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-10 border-t border-tagme-slate/10 pt-6 text-center">
        <p className="text-xs text-tagme-slate/50">{venue.name}</p>
        {contact.phone && (
          <a
            href={`tel:${contact.phone.replace(/\s/g, "")}`}
            className="mt-2 inline-block text-sm text-tagme-gold hover:underline"
          >
            Recepción {contact.phone}
          </a>
        )}
        {experience.avexEnabled && (
          <p className="mt-3 text-xs text-tagme-slate/40">
            AVEX — asistente conversacional disponible
          </p>
        )}
      </footer>

      {experience.avexEnabled && (
        <AvexChat
          tagSlug={tag.slug}
          touchEventId={touchEventId}
          contact={contact}
          roomLabel={
            roomContext.isRoom ? roomContext.displayLabel : null
          }
        />
      )}
    </div>
  );
}
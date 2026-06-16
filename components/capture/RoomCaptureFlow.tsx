"use client";

import { useState } from "react";
import type { RoomContext } from "@/lib/tags/room-context";
import type { TagSummary, VenueSummary } from "@/types";
import { CaptureChoice } from "./CaptureChoice";
import { CaptureConfirmation } from "./CaptureConfirmation";
import { FeedbackForm } from "./FeedbackForm";
import { IncidentForm, type IncidentCategoryOption } from "./IncidentForm";
import { RoomContextBanner } from "@/components/guest/RoomContextBanner";

type CaptureStep = "choice" | "feedback" | "incident" | "confirmation";

export interface RoomCaptureFlowProps {
  tag: TagSummary;
  venue: VenueSummary;
  roomContext: RoomContext;
  incidentCategories: IncidentCategoryOption[];
}

export function RoomCaptureFlow({
  tag,
  venue,
  roomContext,
  incidentCategories,
}: RoomCaptureFlowProps) {
  const [step, setStep] = useState<CaptureStep>("choice");
  const [confirmationMessage, setConfirmationMessage] = useState(
    "¡Gracias por tu opinión!",
  );
  const [confirmationDetail, setConfirmationDetail] = useState(
    "Tu comentario nos ayuda a mejorar la experiencia en el hotel.",
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-8">
      {roomContext.isRoom ? (
        <RoomContextBanner roomContext={roomContext} tagLabel={tag.label} />
      ) : null}

      {!roomContext.isRoom ? (
        <header className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
            {venue.name}
          </p>
          <h1 className="mt-2 font-sans text-2xl font-semibold leading-tight text-tagme-ink">
            {tag.label}
          </h1>
        </header>
      ) : (
        <header className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
            Captura desde habitación
          </p>
          <h1 className="mt-2 font-sans text-2xl font-semibold leading-tight text-tagme-ink">
            {roomContext.displayLabel}
          </h1>
        </header>
      )}

      <section className="flex-1">
        {step === "choice" && (
          <CaptureChoice
            variant="room"
            onSelectFeedback={() => setStep("feedback")}
            onSelectIncident={() => setStep("incident")}
          />
        )}

        {step === "feedback" && (
          <FeedbackForm
            roomTagSlug={tag.slug}
            onSuccess={(message) => {
              setConfirmationMessage(message);
              setConfirmationDetail(
                "Tu comentario nos ayuda a mejorar la experiencia en el hotel.",
              );
              setStep("confirmation");
            }}
            onBack={() => setStep("choice")}
          />
        )}

        {step === "incident" && (
          <IncidentForm
            roomTagSlug={tag.slug}
            categories={incidentCategories}
            onSuccess={(message) => {
              setConfirmationMessage(message);
              setConfirmationDetail(
                "Nuestro equipo de servicio revisará tu reporte a la brevedad.",
              );
              setStep("confirmation");
            }}
            onBack={() => setStep("choice")}
          />
        )}

        {step === "confirmation" && (
          <CaptureConfirmation
            message={confirmationMessage}
            detail={confirmationDetail}
          />
        )}
      </section>
    </div>
  );
}
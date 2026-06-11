"use client";

import { useState } from "react";
import type { StaffSessionContext } from "@/lib/staff/types";
import { CaptureChoice } from "./CaptureChoice";
import { CaptureConfirmation } from "./CaptureConfirmation";
import { FeedbackForm } from "./FeedbackForm";
import { IncidentForm, type IncidentCategoryOption } from "./IncidentForm";
import { SessionCountdown } from "./SessionCountdown";

type CaptureStep = "choice" | "feedback" | "incident" | "confirmation";

export interface CaptureFlowProps {
  sessionToken: string;
  expiresAt: string;
  staff: StaffSessionContext;
  incidentCategories: IncidentCategoryOption[];
}

export function CaptureFlow({
  sessionToken,
  expiresAt,
  staff,
  incidentCategories,
}: CaptureFlowProps) {
  const [step, setStep] = useState<CaptureStep>("choice");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState(
    "¡Gracias por tu opinión!",
  );
  const [confirmationDetail, setConfirmationDetail] = useState(
    "Tu comentario nos ayuda a mejorar la experiencia en el hotel.",
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
          Atención personalizada
        </p>
        <h1 className="mt-2 font-sans text-2xl font-semibold leading-tight text-tagme-ink">
          {staff.displayName}
        </h1>
        <p className="mt-2 text-sm text-tagme-slate/75">
          {staff.jobRoleTitle} · {staff.departmentName}
        </p>
      </header>

      <div className="mb-6">
        <SessionCountdown
          sessionToken={sessionToken}
          initialExpiresAt={expiresAt}
          onExpired={() => setSessionExpired(true)}
        />
      </div>

      <section className="flex-1">
        {step === "choice" && (
          <CaptureChoice
            onSelectFeedback={() => setStep("feedback")}
            onSelectIncident={() => setStep("incident")}
            disabled={sessionExpired}
          />
        )}

        {step === "feedback" && (
          <FeedbackForm
            sessionToken={sessionToken}
            disabled={sessionExpired}
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
            sessionToken={sessionToken}
            categories={incidentCategories}
            disabled={sessionExpired}
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
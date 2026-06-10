import type { BaselineStatus } from "@/types/executive";

export interface CalibrationBannerProps {
  baseline: BaselineStatus;
}

export function CalibrationBanner({ baseline }: CalibrationBannerProps) {
  if (baseline.ready) return null;

  return (
    <div
      role="status"
      className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-5 py-4"
    >
      <p className="text-sm font-medium text-amber-900">
        Período de calibración — día {baseline.day} de 14
      </p>
      <p className="mt-1 text-xs text-amber-800/80">
        {baseline.totalTouches} toques acumulados (meta: 100). Los semáforos de
        metas se activan tras 14 días y volumen mínimo.{" "}
        <a
          href="#calibracion"
          className="font-medium underline underline-offset-2 hover:text-amber-900"
        >
          Más sobre calibración
        </a>
      </p>
    </div>
  );
}
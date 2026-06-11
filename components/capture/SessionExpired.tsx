import type { StaffSessionContext } from "@/lib/staff/types";

export interface SessionExpiredProps {
  message: string;
  staff?: StaffSessionContext;
}

export function SessionExpired({ message, staff }: SessionExpiredProps) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
          Sesión finalizada
        </p>
        {staff ? (
          <>
            <h1 className="mt-2 font-sans text-2xl font-semibold leading-tight text-tagme-ink">
              {staff.displayName}
            </h1>
            <p className="mt-2 text-sm text-tagme-slate/75">
              {staff.jobRoleTitle} · {staff.departmentName}
            </p>
          </>
        ) : (
          <h1 className="mt-2 font-sans text-2xl font-semibold leading-tight text-tagme-ink">
            Captura no disponible
          </h1>
        )}
      </header>

      <div
        role="alert"
        className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-4 text-sm leading-relaxed text-amber-900"
      >
        {message}
      </div>

      <p className="mt-6 text-center text-xs text-tagme-slate/50">
        Acerca la tarjeta del personal al teléfono para iniciar una nueva sesión.
      </p>
    </div>
  );
}
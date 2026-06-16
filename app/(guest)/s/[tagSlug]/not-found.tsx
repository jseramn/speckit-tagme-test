export default function StaffTagNotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
        TagMe Staff
      </p>
      <h1 className="mt-3 text-2xl font-semibold text-tagme-ink">
        Tarjeta no válida
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-tagme-slate/75">
        Esta tarjeta no está activa o fue revocada. Pide ayuda al personal del
        hotel.
      </p>
    </div>
  );
}
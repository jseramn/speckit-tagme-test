export interface FallbackHelpProps {
  tagSlug?: string;
}

export function FallbackHelp({ tagSlug }: FallbackHelpProps) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-tagme-gold/15 text-2xl">
        📱
      </div>

      <h1 className="text-xl font-semibold text-tagme-ink">
        Punto NFC no encontrado
      </h1>

      {tagSlug && (
        <p className="mt-2 font-mono text-sm text-tagme-slate/60">
          /t/{tagSlug}
        </p>
      )}

      <p className="mt-4 text-sm leading-relaxed text-tagme-slate/80">
        No pudimos identificar este tag. Acerca tu teléfono al punto NFC del
        hotel o escanea el código impreso en recepción.
      </p>

      <div className="mt-8 w-full rounded-2xl border border-tagme-slate/10 bg-white/80 p-5 text-left">
        <h2 className="text-xs font-medium uppercase tracking-widest text-tagme-gold">
          ¿Necesita ayuda?
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-tagme-slate">
          <li>• Verifique que NFC esté activo en su teléfono</li>
          <li>• Mantenga el teléfono cerca del tag 2–3 segundos</li>
          <li>• Solicite asistencia en recepción</li>
        </ul>
        <a
          href="tel:+576056649494"
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-tagme-ink px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Llamar recepción
        </a>
      </div>
    </div>
  );
}
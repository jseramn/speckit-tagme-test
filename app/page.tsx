import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-tagme-cream px-6">
      <div className="max-w-md text-center">
        <p className="mb-2 text-sm uppercase tracking-[0.2em] text-tagme-gold">
          TagMe™
        </p>
        <h1 className="mb-4 text-3xl font-light text-tagme-ink">
          Plataforma NFC/IoT
        </h1>
        <p className="mb-8 text-tagme-slate">
          Fundación M0 lista. El hub de huéspedes estará en{" "}
          <code className="rounded bg-white/60 px-1 text-sm">/t/[tagSlug]</code>{" "}
          (Milestone M1).
        </p>
        <div className="flex flex-col gap-3 text-sm">
          <Link
            href="/t/caribe-lobby"
            className="rounded-lg border border-tagme-gold/40 bg-white px-4 py-3 text-tagme-ink transition hover:border-tagme-gold"
          >
            Preview: /t/caribe-lobby (requiere seed)
          </Link>
          <p className="text-xs text-tagme-slate/70">
            Piloto: Hotel Caribe by Faranda Grand
          </p>
        </div>
      </div>
    </main>
  );
}
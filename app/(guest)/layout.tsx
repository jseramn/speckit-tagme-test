/** Guest routes layout — mobile-first silent luxury (M1). */
export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-tagme-cream text-tagme-ink antialiased">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-48 bg-gradient-to-b from-tagme-gold/8 to-transparent" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
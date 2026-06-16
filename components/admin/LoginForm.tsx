"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.message ?? "No se pudo iniciar sesión");
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError("Error de conexión. Intente de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-tagme-cream px-5">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-48 bg-gradient-to-b from-tagme-gold/10 to-transparent" />

      <div className="relative w-full max-w-md rounded-2xl border border-tagme-slate/10 bg-white p-8 shadow-sm">
        <Image src="/logo.png" alt="TagMe Logo" width={40} height={40} className="mb-5 object-contain" />
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-tagme-gold">
          TagMe Admin
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-tagme-ink">
          Acceso staff
        </h1>
        <p className="mt-2 text-sm text-tagme-slate">
          {nextPath.startsWith("/executive")
            ? "Acceso gerencial — panorama, alertas y reportes ejecutivos."
            : "Inicie sesión para gestionar contenido, tags NFC y métricas."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
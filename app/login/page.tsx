"use client";

import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-tagme-cream">
          <p className="text-sm text-tagme-slate">Cargando…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
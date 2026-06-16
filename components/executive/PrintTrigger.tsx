"use client";

import { useEffect } from "react";

export function PrintTrigger() {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="mb-6 rounded-lg border border-tagme-slate/20 px-4 py-2 text-sm print:hidden"
    >
      Imprimir / Guardar PDF
    </button>
  );
}
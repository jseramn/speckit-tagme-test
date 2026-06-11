import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient, setAuthCookies } from "@insforge/sdk/ssr";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_BODY", message: "JSON inválido" },
      { status: 400 },
    );
  }

  const parsed = signInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Email y contraseña requeridos",
        details: parsed.error.flatten(),
      },
      { status: 422 },
    );
  }

  const client = createServerClient();
  const { data, error } = await client.auth.signInWithPassword(parsed.data);

  if (error || !data?.accessToken) {
    return NextResponse.json(
      {
        error: error?.error ?? "AUTH_UNAUTHORIZED",
        message: error?.message ?? "Credenciales inválidas",
      },
      { status: error?.statusCode ?? 401 },
    );
  }

  // access_token in JSON supports RLS contract tests and CLI tooling; browser sessions stay cookie-based.
  const response = NextResponse.json({
    user: data.user,
    access_token: data.accessToken,
  });
  setAuthCookies(response.cookies, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });

  return response;
}
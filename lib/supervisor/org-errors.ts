import { AuthError } from "@/lib/auth/session";

export class SupervisorOrgError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "VALIDATION_ERROR"
      | "CONFLICT"
      | "FORBIDDEN",
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "SupervisorOrgError";
  }
}

export function supervisorOrgErrorResponse(
  err: unknown,
): { body: { error: string; message: string }; status: number } | null {
  if (err instanceof SupervisorOrgError) {
    return {
      body: { error: err.code, message: err.message },
      status: err.statusCode,
    };
  }

  if (err instanceof AuthError) {
    return {
      body: { error: err.code, message: err.message },
      status: err.code === "UNAUTHORIZED" ? 401 : 403,
    };
  }

  return null;
}
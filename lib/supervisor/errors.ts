import { AuthError } from "@/lib/auth/session";
import { IncidentTransitionError } from "@/lib/supervisor/incident-transitions";

export class SupervisorIncidentError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "INVALID_TRANSITION"
      | "VALIDATION_ERROR",
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "SupervisorIncidentError";
  }
}

export function supervisorIncidentErrorResponse(
  err: unknown,
): { body: { error: string; message: string }; status: number } | null {
  if (err instanceof SupervisorIncidentError) {
    return {
      body: { error: err.code, message: err.message },
      status: err.statusCode,
    };
  }

  if (err instanceof IncidentTransitionError) {
    return {
      body: { error: err.code, message: err.message },
      status: 422,
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
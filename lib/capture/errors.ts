export type CaptureErrorCode =
  | "SESSION_EXPIRED"
  | "INVALID_SESSION"
  | "INVALID_STAFF_TAG"
  | "INVALID_ROOM_TAG"
  | "NOT_IMPLEMENTED";

export class CaptureError extends Error {
  constructor(
    public readonly code: CaptureErrorCode,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "CaptureError";
  }
}

export function captureErrorResponse(
  err: unknown,
): { body: { error: string; message: string }; status: number } | null {
  if (!(err instanceof CaptureError)) {
    return null;
  }

  return {
    body: { error: err.code, message: err.message },
    status: err.statusCode,
  };
}
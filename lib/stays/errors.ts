export class StayError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "StayError";
  }
}

export function stayErrorResponse(error: unknown) {
  if (error instanceof StayError) {
    return {
      status: error.statusCode,
      body: { error: error.code, message: error.message },
    };
  }
  return null;
}
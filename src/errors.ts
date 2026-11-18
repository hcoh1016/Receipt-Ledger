export type ErrorCode =
  | "VALIDATION"
  | "NOT_FOUND"
  | "STORAGE"
  | "OCR_FAILED"
  | "NO_TEXT"
  | "TIMEOUT"
  | "CANCELLED"
  | "BUSY"
  | "UNSUPPORTED"
  | "IMAGE";
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "AppError";
  }
}
export function errorMessage(e: unknown): string {
  return e instanceof AppError
    ? e.message
    : "처리에 실패했습니다. 다시 시도해 주세요.";
}

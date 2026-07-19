export class AppError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly httpStatus: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ErrorCodes = {
  OK: 0,
  INVALID_PARAM: 10001,
  EMPTY_INGREDIENTS: 10002,
  UNAUTHORIZED: 20001,
  FORBIDDEN: 20002,
  NOT_FOUND_INGREDIENT: 30001,
  NOT_FOUND_RECIPE: 30002,
  RATE_LIMITED: 40001,
  AI_QUOTA_EXCEEDED: 40002,
  AI_PROVIDER_FAILED: 40003,
  AI_INVALID_JSON: 40004,
  AI_TIMEOUT: 40005,
  AI_NOT_CONFIGURED: 40006,
  INTERNAL: 50000,
} as const;

import { ApiError } from "./http";

/**
 * RFC 7807 ProblemDetail — то, что отдаёт GlobalExceptionHandler на бэке.
 * При ошибках валидации в `errors` лежит { имяПоля: сообщение }.
 */
export type ProblemPayload = {
  status?: number;
  title?: string;
  detail?: string;
  errors?: Record<string, string>;
};

export function readProblem(error: unknown): ProblemPayload {
  if (!(error instanceof ApiError)) {
    return {};
  }

  const payload = error.payload;

  if (!payload || typeof payload !== "object") {
    return {};
  }

  return payload as ProblemPayload;
}

/** Пофайловые ошибки валидации с бэка, если они есть. */
export function readFieldErrors(error: unknown): Record<string, string> {
  return readProblem(error).errors ?? {};
}

/**
 * Общий фолбэк для сообщений об ошибках.
 * Доменные обёртки (auth, submission) сначала пробуют свои формулировки,
 * а сюда падают за остальным.
 */
export function toFriendlyApiError(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (error instanceof ApiError) {
    const problem = readProblem(error);

    if (error.status === 401) {
      return "Your session has expired. Please log in again.";
    }

    if (error.status === 403) {
      return "You don’t have permission to do this.";
    }

    if (error.status === 429) {
      return "Too many requests right now. Please wait a minute and try again.";
    }

    if (error.status >= 500) {
      return "The server is having trouble right now. Please try again in a moment.";
    }

    if (problem.detail) {
      return problem.detail;
    }
  }

  if (error instanceof TypeError) {
    return "We couldn’t reach ExchangeHub. Check your connection and try again.";
  }

  return fallback;
}

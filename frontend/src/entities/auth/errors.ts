import { ApiError } from "../../shared/api/http";
import { readProblem } from "../../shared/api/problem";
import type { AuthMode } from "../../shared/types/auth";

export class AdminAccessRequiredError extends Error {
  constructor() {
    super("Admin access required");
    this.name = "AdminAccessRequiredError";
  }
}

/**
 * Возвращает КЛЮЧ перевода, а не готовый текст: сообщение показывается в
 * компоненте, который знает про текущий язык, а этот модуль — нет.
 */
function toFieldErrorKey(field: string, message: string) {
  if (message === "must not be blank" || message === "не должно быть пустым") {
    if (field === "email") {
      return "validation.enterEmail";
    }

    if (field === "name") {
      return "validation.enterName";
    }

    return "validation.enterPassword";
  }

  if (field === "email" && message.toLowerCase().includes("email")) {
    return "validation.invalidEmail";
  }

  if (field === "name" && message.includes("size must be between 2 and 100")) {
    return "validation.nameLength";
  }

  if (field === "password" && message.includes("size must be between 6 and 72")) {
    return "validation.passwordLength";
  }

  if (message === "size must be between 6 and 2147483647") {
    return "validation.passwordMin";
  }

  return "";
}

/** Ключ перевода для ошибки входа или регистрации. */
export function toAuthErrorKey(error: unknown, mode: AuthMode) {
  if (error instanceof AdminAccessRequiredError) {
    return "errors.adminRequired";
  }

  if (error instanceof ApiError) {
    const problem = readProblem(error);

    if (problem.errors) {
      const firstError = Object.entries(problem.errors)[0];

      if (firstError) {
        const key = toFieldErrorKey(firstError[0], firstError[1]);

        if (key) {
          return key;
        }
      }
    }

    if (error.status === 400) {
      return "validation.fixFields";
    }

    if (error.status === 401) {
      return mode === "admin-login" ? "errors.badAdminCredentials" : "errors.badCredentials";
    }

    if (error.status === 409) {
      return "errors.emailTaken";
    }

    if (error.status === 429) {
      return "errors.tooManyRequests";
    }

    if (error.status >= 500) {
      return "errors.server";
    }
  }

  if (error instanceof TypeError) {
    return "errors.network";
  }

  return "errors.generic";
}

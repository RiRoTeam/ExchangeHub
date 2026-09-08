import { ApiError } from "../../shared/api/http";
import { readProblem } from "../../shared/api/problem";
import { message, type Message } from "../../shared/i18n/message";
import type { AuthMode } from "../../shared/types/auth";

export class AdminAccessRequiredError extends Error {
  constructor() {
    super("Admin access required");
    this.name = "AdminAccessRequiredError";
  }
}

/** «size must be between 6 and 72» — стандартный текст @Size из Bean Validation. */
const SIZE_RANGE = /size must be between (\d+) and (\d+)/;

/** Верхняя граница, которую Hibernate Validator подставляет, когда max не задан. */
const NO_UPPER_BOUND = 2147483647;

const BLANK_MESSAGES = ["must not be blank", "must not be null", "не должно быть пустым"];

/**
 * Сообщение для одной ошибки поля.
 *
 * Границы берём из ответа сервера, а не из констант фронтенда: тогда текст не
 * может разойтись с тем, что на самом деле проверяет бэкенд.
 */
function toFieldMessage(field: string, detail: string): Message | null {
  if (BLANK_MESSAGES.includes(detail)) {
    if (field === "email") {
      return message("validation.enterEmail");
    }

    if (field === "name") {
      return message("validation.enterName");
    }

    return message("validation.enterPassword");
  }

  if (field === "email" && detail.toLowerCase().includes("email")) {
    return message("validation.invalidEmail");
  }

  const range = SIZE_RANGE.exec(detail);

  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);

    if (field === "name") {
      return message("validation.nameLength", { min, max });
    }

    if (max === NO_UPPER_BOUND) {
      return message("validation.passwordMin", { min });
    }

    return message("validation.passwordLength", { min, max });
  }

  return null;
}

/** Сообщение для ошибки входа или регистрации. */
export function toAuthErrorMessage(error: unknown, mode: AuthMode): Message {
  if (error instanceof AdminAccessRequiredError) {
    return message("errors.adminRequired");
  }

  if (error instanceof ApiError) {
    const problem = readProblem(error);

    if (problem.errors) {
      // Порядок ключей в объекте не гарантирован, поэтому берём первое поле,
      // для которого у нас есть понятный текст, а не первое попавшееся.
      for (const [field, detail] of Object.entries(problem.errors)) {
        const fieldMessage = toFieldMessage(field, detail);

        if (fieldMessage) {
          return fieldMessage;
        }
      }
    }

    if (error.status === 400) {
      return message("validation.fixFields");
    }

    if (error.status === 401) {
      return message(
        mode === "admin-login" ? "errors.badAdminCredentials" : "errors.badCredentials"
      );
    }

    if (error.status === 409) {
      return message("errors.emailTaken");
    }

    if (error.status === 429) {
      return message("errors.tooManyRequests");
    }

    if (error.status >= 500) {
      return message("errors.server");
    }
  }

  if (error instanceof TypeError) {
    return message("errors.network");
  }

  return message("errors.generic");
}

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/http";
import { readProblem } from "../api/problem";

/**
 * Текст ошибки запроса на языке интерфейса.
 * Известные статусы переводим сами; для остального вызывающий передаёт свой
 * переведённый запасной текст.
 */
export function useApiErrorText() {
  const { t } = useTranslation();

  return useCallback(
    (error: unknown, fallback: string) => {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          return t("errors.sessionExpired");
        }

        if (error.status === 403) {
          return t("errors.forbidden");
        }

        if (error.status === 429) {
          return t("errors.tooManyRequests");
        }

        if (error.status >= 500) {
          return t("errors.server");
        }

        const detail = readProblem(error).detail;

        // Известные сообщения бэка переводим, остальные показываем как есть.
        if (detail === "Wrong current password") {
          return t("errors.wrongCurrentPassword");
        }

        if (detail === "Cannot demote the last administrator") {
          return t("admin.lastAdmin");
        }

        if (detail) {
          return detail;
        }
      }

      if (error instanceof TypeError) {
        return t("errors.network");
      }

      return fallback;
    },
    [t]
  );
}

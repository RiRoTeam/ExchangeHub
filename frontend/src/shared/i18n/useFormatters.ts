import { useCallback, useMemo } from "react";
import { parseApiDate } from "../../entities/program/lib";
import { useLanguage } from "./useLanguage";

/**
 * Форматирование дат и чисел по языку интерфейса.
 * Раньше вызывался голый toLocaleDateString(), и формат зависел от системы
 * пользователя, а не от выбранного языка.
 */
export function useFormatters() {
  const { locale } = useLanguage();

  const numberFormat = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const formatDate = useCallback(
    (value: string | null | undefined, fallback = "") => {
      if (!value) {
        return fallback;
      }

      const parsed = parseApiDate(value);

      return parsed ? parsed.toLocaleDateString(locale) : value;
    },
    [locale]
  );

  const formatDateTime = useCallback(
    (value: string | null | undefined, fallback = "") => {
      if (!value) {
        return fallback;
      }

      const parsed = parseApiDate(value);

      return parsed ? parsed.toLocaleString(locale) : value;
    },
    [locale]
  );

  const formatDay = useCallback(
    (value: string) => {
      const parsed = parseApiDate(value);

      return parsed
        ? parsed.toLocaleDateString(locale, { day: "numeric", month: "short" })
        : value;
    },
    [locale]
  );

  const formatNumber = useCallback(
    (value: number) => numberFormat.format(value),
    [numberFormat]
  );

  return { formatDate, formatDateTime, formatDay, formatNumber };
}

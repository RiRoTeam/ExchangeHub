import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  isLanguage,
  storeLanguage,
  toIntlLocale,
  DEFAULT_LANGUAGE,
  type Language
} from "./config";

/** Текущий язык, переключение и локаль для Intl в одном месте. */
export function useLanguage() {
  const { i18n } = useTranslation();
  const language: Language = isLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE;

  const changeLanguage = useCallback(
    (next: Language) => {
      void i18n.changeLanguage(next);
      storeLanguage(next);
      document.documentElement.lang = next;
    },
    [i18n]
  );

  return { language, changeLanguage, locale: toIntlLocale(language) };
}

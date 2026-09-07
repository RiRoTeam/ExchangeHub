import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { detectInitialLanguage, DEFAULT_LANGUAGE, type Language } from "./config";
import { en } from "./en";
import { ru } from "./ru";

export const resources = {
  ru: { translation: ru },
  en: { translation: en }
} as const;

void i18next.use(initReactI18next).init({
  resources,
  lng: detectInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  // React экранирует вывод сам — вторая обработка ломала бы кавычки и тире.
  interpolation: { escapeValue: false },
  returnNull: false
});

export { i18next };
export type { Language };

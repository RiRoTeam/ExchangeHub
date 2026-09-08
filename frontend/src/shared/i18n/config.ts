export const SUPPORTED_LANGUAGES = ["ru", "en"] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "ru";

export const LANGUAGE_STORAGE_KEY = "exchangehub-language";

export const LANGUAGE_LABELS: Record<Language, string> = {
  ru: "Рус",
  en: "Eng"
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && SUPPORTED_LANGUAGES.includes(value as Language);
}

/**
 * Язык при запуске: сохранённый выбор, иначе язык браузера, иначе русский.
 * localStorage может бросить в приватном режиме — читаем осторожно.
 */
export function detectInitialLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

    if (isLanguage(stored)) {
      return stored;
    }
  } catch {
    // Хранилище недоступно — не повод падать.
  }

  const browserLanguage =
    typeof navigator === "undefined" ? "" : navigator.language.slice(0, 2);

  return isLanguage(browserLanguage) ? browserLanguage : DEFAULT_LANGUAGE;
}

export function storeLanguage(language: Language) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Выбор не переживёт перезагрузку, но интерфейс переключится.
  }
}

/** Локаль для Intl: язык интерфейса определяет формат дат и чисел. */
export function toIntlLocale(language: Language) {
  return language === "ru" ? "ru-RU" : "en-GB";
}

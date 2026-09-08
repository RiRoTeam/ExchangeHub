import { useTranslation } from "react-i18next";
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from "../../shared/i18n/config";
import { useLanguage } from "../../shared/i18n/useLanguage";

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();

  return (
    <div aria-label={t("common.language")} className="language-switcher" role="group">
      {SUPPORTED_LANGUAGES.map((option) => (
        <button
          aria-pressed={option === language}
          className={`language-switcher__button ${
            option === language ? "language-switcher__button--active" : ""
          }`}
          key={option}
          lang={option}
          onClick={() => changeLanguage(option)}
          type="button"
        >
          {LANGUAGE_LABELS[option]}
        </button>
      ))}
    </div>
  );
}

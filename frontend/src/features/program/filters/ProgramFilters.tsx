import { useTranslation } from "react-i18next";
import type { ProgramType } from "../../../shared/types/program";

type ProgramFiltersProps = {
  country: string;
  type: ProgramType | "";
  onCountryChange: (value: string) => void;
  onTypeChange: (value: ProgramType | "") => void;
  onReset: () => void;
};

const typeOptions: ProgramType[] = ["EXCHANGE", "INTERNSHIP", "SCHOLARSHIP", "OTHER"];

export function ProgramFilters({
  country,
  type,
  onCountryChange,
  onTypeChange,
  onReset
}: ProgramFiltersProps) {
  const { t } = useTranslation();

  return (
    <section className="filter-controls">
      <h3>{t("programs.filters")}</h3>
      <label className="auth-form-fields__label">
        <span>{t("programs.country")}</span>
        <input
          className="text-input"
          onChange={(event) => onCountryChange(event.target.value)}
          placeholder={t("programs.countryPlaceholder")}
          type="text"
          value={country}
        />
      </label>

      <label className="auth-form-fields__label">
        <span>{t("programs.type")}</span>
        <select
          className="text-input"
          onChange={(event) => onTypeChange(event.target.value as ProgramType | "")}
          value={type}
        >
          <option value="">{t("programs.allTypes")}</option>
          {typeOptions.map((option) => (
            <option key={option} value={option}>
              {t(`programType.${option}`)}
            </option>
          ))}
        </select>
      </label>

      <button className="secondary-button" onClick={onReset} type="button">
        {t("programs.clearFilters")}
      </button>
    </section>
  );
}

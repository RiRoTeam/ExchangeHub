import { useTranslation } from "react-i18next";

type ProgramSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function ProgramSearch({ value, onChange, placeholder }: ProgramSearchProps) {
  const { t } = useTranslation();

  return (
    <input
      aria-label={t("common.search")}
      className="text-input"
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder ?? t("programs.searchPlaceholder")}
      type="search"
      value={value}
    />
  );
}

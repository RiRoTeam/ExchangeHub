import type { ProgramType } from "../../../shared/types/program";

type ProgramFiltersProps = {
  country: string;
  type: ProgramType | "";
  onCountryChange: (value: string) => void;
  onTypeChange: (value: ProgramType | "") => void;
  onReset: () => void;
};

const typeOptions: Array<{ value: ProgramType; label: string }> = [
  { value: "EXCHANGE", label: "Exchange" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "SCHOLARSHIP", label: "Scholarship" },
  { value: "OTHER", label: "Other" }
];

export function ProgramFilters({
  country,
  type,
  onCountryChange,
  onTypeChange,
  onReset
}: ProgramFiltersProps) {
  return (
    <section className="filter-controls">
      <h3>Filters</h3>
      <label className="auth-form-fields__label">
        <span>Country</span>
        <input
          className="text-input"
          onChange={(event) => onCountryChange(event.target.value)}
          placeholder="Search by country"
          type="text"
          value={country}
        />
      </label>

      <label className="auth-form-fields__label">
        <span>Type</span>
        <select
          className="text-input"
          onChange={(event) => onTypeChange(event.target.value as ProgramType | "")}
          value={type}
        >
          <option value="">All types</option>
          {typeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button className="secondary-button" onClick={onReset} type="button">
        Clear filters
      </button>
    </section>
  );
}

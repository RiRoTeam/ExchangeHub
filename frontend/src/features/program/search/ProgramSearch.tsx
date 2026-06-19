type ProgramSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function ProgramSearch({
  value,
  onChange,
  placeholder = "Search by title, description, or country"
}: ProgramSearchProps) {
  return (
    <input
      aria-label="Program search"
      className="text-input"
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type="search"
      value={value}
    />
  );
}

type ProgramSearchProps = {
  placeholder?: string;
};

export function ProgramSearch({
  placeholder = "Search by title, description, or country"
}: ProgramSearchProps) {
  return (
    <input
      aria-label="Program search"
      className="text-input"
      placeholder={placeholder}
      type="search"
    />
  );
}

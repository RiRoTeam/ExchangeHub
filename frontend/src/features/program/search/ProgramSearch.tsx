type ProgramSearchProps = {
  placeholder?: string;
};

export function ProgramSearch({
  placeholder = "Search by title, description, or country"
}: ProgramSearchProps) {
  return <input aria-label="Program search" placeholder={placeholder} type="search" />;
}

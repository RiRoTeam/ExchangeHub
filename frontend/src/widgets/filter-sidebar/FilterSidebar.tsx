import type { ReactNode } from "react";

type FilterSidebarProps = {
  title?: string;
  searchPlaceholder?: string;
  children?: ReactNode;
};

export function FilterSidebar({
  title = "Search and filters",
  searchPlaceholder = "Search programs",
  children
}: FilterSidebarProps) {
  return (
    <section aria-label={title} className="filter-sidebar">
      <h2>{title}</h2>
      <input
        aria-label="Search programs"
        className="text-input"
        placeholder={searchPlaceholder}
        type="search"
      />
      <div className="filter-sidebar__content">{children}</div>
    </section>
  );
}

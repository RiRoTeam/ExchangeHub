import type { ReactNode } from "react";

type FilterSidebarProps = {
  title?: string;
  children?: ReactNode;
};

export function FilterSidebar({
  title = "Search and filters",
  children
}: FilterSidebarProps) {
  return (
    <section aria-label={title} className="filter-sidebar">
      <h2>{title}</h2>
      <div className="filter-sidebar__content">{children}</div>
    </section>
  );
}

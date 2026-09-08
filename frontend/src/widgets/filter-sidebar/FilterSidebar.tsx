import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type FilterSidebarProps = {
  title?: string;
  children?: ReactNode;
};

export function FilterSidebar({ title, children }: FilterSidebarProps) {
  const { t } = useTranslation();
  const heading = title ?? t("programs.searchAndFilters");

  return (
    <section aria-label={heading} className="filter-sidebar">
      <h2>{heading}</h2>
      <div className="filter-sidebar__content">{children}</div>
    </section>
  );
}

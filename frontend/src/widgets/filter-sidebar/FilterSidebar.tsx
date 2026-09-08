import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

type FilterSidebarProps = {
  title?: string;
  children?: ReactNode;
};

/**
 * На широком экране это боковая колонка, всегда раскрытая.
 * На узком — свёрнутый блок с кнопкой: иначе фильтры занимают весь первый
 * экран, и до программ приходится доскроллить.
 *
 * Состояние держим здесь, а прячет содержимое CSS: на десктопе правило
 * схлопывания не действует, поэтому свёрнутым он там не окажется никогда.
 */
export function FilterSidebar({ title, children }: FilterSidebarProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();
  const heading = title ?? t("programs.searchAndFilters");

  return (
    <section aria-label={heading} className="filter-sidebar">
      <h2 className="filter-sidebar__heading">{heading}</h2>

      <button
        aria-controls={contentId}
        aria-expanded={isOpen}
        className="filter-sidebar__toggle"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span>{heading}</span>
        <span aria-hidden="true" className="filter-sidebar__chevron">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      <div
        className={`filter-sidebar__content ${isOpen ? "" : "filter-sidebar__content--collapsed"}`}
        id={contentId}
      >
        {children}
      </div>
    </section>
  );
}

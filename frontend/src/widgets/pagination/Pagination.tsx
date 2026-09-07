import { useTranslation } from "react-i18next";
import { getPageItems, PAGE_GAP } from "../../shared/lib/pagination";

type PaginationProps = {
  /** Нулевой номер текущей страницы, как у Spring. */
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Блокирует кнопки, пока страница грузится. */
  disabled?: boolean;
};

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false
}: PaginationProps) {
  const { t } = useTranslation();

  // Одна страница — пагинатор только занимает место.
  if (totalPages <= 1) {
    return null;
  }

  const items = getPageItems(currentPage, totalPages);
  const isFirst = currentPage <= 0;
  const isLast = currentPage >= totalPages - 1;

  return (
    <nav aria-label={t("pagination.label")} className="pagination">
      <button
        className="pagination__step"
        disabled={disabled || isFirst}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        {t("pagination.previous")}
      </button>

      <ul className="pagination__list">
        {items.map((item, index) =>
          item === PAGE_GAP ? (
            <li aria-hidden="true" className="pagination__gap" key={`gap-${index}`}>
              …
            </li>
          ) : (
            <li key={item}>
              <button
                aria-current={item === currentPage ? "page" : undefined}
                aria-label={t("pagination.page", { page: item + 1 })}
                className={`pagination__page ${item === currentPage ? "pagination__page--active" : ""}`}
                disabled={disabled}
                onClick={() => onPageChange(item)}
                type="button"
              >
                {item + 1}
              </button>
            </li>
          )
        )}
      </ul>

      <button
        className="pagination__step"
        disabled={disabled || isLast}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        {t("pagination.next")}
      </button>
    </nav>
  );
}

/** Многоточие между разрывами в ряду номеров страниц. */
export const PAGE_GAP = "gap" as const;

export type PageItem = number | typeof PAGE_GAP;

/**
 * Ряд кнопок пагинатора: первая, последняя, текущая и её соседи,
 * разрывы схлопнуты в многоточие.
 *
 * Номера страниц нулевые — как у Spring. Подпись (+1) рисует компонент.
 */
export function getPageItems(
  currentPage: number,
  totalPages: number,
  siblingCount = 1
): PageItem[] {
  if (totalPages <= 0) {
    return [];
  }

  const current = Math.min(Math.max(currentPage, 0), totalPages - 1);

  // Первая, последняя, окно вокруг текущей и два многоточия. Если весь ряд
  // короче этого, многоточия ничего не экономят — показываем все номера.
  const maxWithoutGaps = 2 * siblingCount + 5;

  if (totalPages <= maxWithoutGaps) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  const shown = new Set<number>();

  shown.add(0);
  shown.add(totalPages - 1);

  for (let offset = -siblingCount; offset <= siblingCount; offset += 1) {
    const candidate = current + offset;

    if (candidate >= 0 && candidate < totalPages) {
      shown.add(candidate);
    }
  }

  const sorted = Array.from(shown).sort((left, right) => left - right);
  const items: PageItem[] = [];

  sorted.forEach((pageNumber, index) => {
    if (index > 0 && pageNumber - sorted[index - 1] > 1) {
      // Разрыв ровно в одну страницу многоточием не заменяем —
      // «1 … 3» занимает столько же места, сколько «1 2 3», но хуже читается.
      if (pageNumber - sorted[index - 1] === 2) {
        items.push(pageNumber - 1);
      } else {
        items.push(PAGE_GAP);
      }
    }

    items.push(pageNumber);
  });

  return items;
}

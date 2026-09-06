import type { Program } from "../../shared/types/program";

/**
 * Поиск по уже загруженному избранному.
 * Бэк фильтрацию избранного не умеет, поэтому ищем на клиенте.
 */
export function filterFavorites(programs: Program[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return programs;
  }

  return programs.filter((program) =>
    [program.title, program.country, program.description].some((field) =>
      field?.toLowerCase().includes(normalizedQuery)
    )
  );
}

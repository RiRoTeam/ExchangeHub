import { authorizedJsonBody, requestJson } from "../../shared/api/http";
import type { Program, ProgramFilters } from "../../shared/types/program";
import type { ProgramDraft } from "../../shared/types/submission";

function toSearchParams(filters: ProgramFilters) {
  const searchParams = new URLSearchParams();

  if (filters.type) {
    searchParams.set("type", filters.type);
  }

  if (filters.country?.trim()) {
    searchParams.set("country", filters.country.trim());
  }

  if (filters.query?.trim()) {
    searchParams.set("q", filters.query.trim());
  }

  return searchParams;
}

export async function listPrograms(filters: ProgramFilters, signal?: AbortSignal) {
  const searchParams = toSearchParams(filters);
  const query = searchParams.toString();
  const path = query ? `/programs?${query}` : "/programs";

  return requestJson<Program[]>(path, { signal });
}

/** GET /api/programs/{id} — публичная карточка программы. */
export function getProgramById(id: number, signal?: AbortSignal) {
  return requestJson<Program>(`/programs/${id}`, { signal });
}

/** POST /api/admin/programs — опубликовать программу минуя модерацию (только ADMIN). */
export function createProgram(draft: ProgramDraft) {
  return authorizedJsonBody<Program>("POST", "/admin/programs", draft);
}

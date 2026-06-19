import { requestJson } from "../../shared/api/http";
import type { Program, ProgramFilters } from "../../shared/types/program";

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

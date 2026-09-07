import { authorizedJsonBody, requestJson } from "../../shared/api/http";
import type { Program, ProgramFilters } from "../../shared/types/program";
import type { ProgramEventType } from "../../shared/types/analytics";
import type { ProgramDraft } from "../../shared/types/submission";

/**
 * Конверт страницы, который отдаёт Spring при
 * PageSerializationMode.VIA_DTO (см. PaginationConfig на бэке):
 * метаданные лежат во вложенном `page`, а не в корне ответа.
 */
type SpringPageEnvelope<T> = {
  content: T[];
  page?: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
};

/** Нормализованная страница — интерфейс не знает про форму конверта Spring. */
export type ProgramPage = {
  programs: Program[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type ProgramPageRequest = {
  page?: number;
  size?: number;
};

export const PROGRAMS_PAGE_SIZE = 12;

function toSearchParams(filters: ProgramFilters, pagination: ProgramPageRequest) {
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

  searchParams.set("page", String(Math.max(pagination.page ?? 0, 0)));
  searchParams.set("size", String(pagination.size ?? PROGRAMS_PAGE_SIZE));

  return searchParams;
}

function toProgramPage(envelope: SpringPageEnvelope<Program>): ProgramPage {
  const programs = envelope.content ?? [];
  // Подстраховка на случай, если режим сериализации на бэке переключат
  // обратно на плоский: лучше показать одну страницу, чем NaN в счётчике.
  const meta = envelope.page ?? {
    size: programs.length,
    number: 0,
    totalElements: programs.length,
    totalPages: programs.length ? 1 : 0
  };

  return {
    programs,
    page: meta.number,
    size: meta.size,
    totalElements: meta.totalElements,
    totalPages: meta.totalPages
  };
}

export async function listPrograms(
  filters: ProgramFilters,
  pagination: ProgramPageRequest = {},
  signal?: AbortSignal
) {
  const query = toSearchParams(filters, pagination).toString();
  const envelope = await requestJson<SpringPageEnvelope<Program>>(`/programs?${query}`, {
    signal
  });

  return toProgramPage(envelope);
}

/** GET /api/programs/{id} — публичная карточка программы. */
export function getProgramById(id: number, signal?: AbortSignal) {
  return requestJson<Program>(`/programs/${id}`, { signal });
}

/** POST /api/admin/programs — опубликовать программу минуя модерацию (только ADMIN). */
export function createProgram(draft: ProgramDraft) {
  return authorizedJsonBody<Program>("POST", "/admin/programs", draft);
}

/** PUT /api/admin/programs/{id} — отредактировать программу (только ADMIN). */
export function updateProgram(id: number, draft: ProgramDraft) {
  return authorizedJsonBody<Program>("PUT", `/admin/programs/${id}`, draft);
}

/** DELETE /api/admin/programs/{id} — удалить программу (только ADMIN). */
export function deleteProgram(id: number) {
  return authorizedJsonBody<void>("DELETE", `/admin/programs/${id}`);
}

/**
 * POST /api/programs/{id}/events — просмотр карточки или переход по ссылке.
 * Публичный эндпоинт, токен не нужен.
 */
export function recordProgramEvent(id: number, type: ProgramEventType) {
  return requestJson<void>(`/programs/${id}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type })
  });
}

/**
 * Аналитика не должна ломать страницу: ошибку глотаем молча.
 * У эндпоинта рейт-лимит 120/мин, так что отказ здесь ожидаем и не важен.
 */
export function trackProgramEvent(id: number, type: ProgramEventType) {
  void recordProgramEvent(id, type).catch(() => undefined);
}

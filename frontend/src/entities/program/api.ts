import { authorizedJsonBody, authorizedRequestJson, requestJson } from "../../shared/api/http";
import type { Program, ProgramFilters } from "../../shared/types/program";
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
  // Older Spring Page serialization kept these fields at the response root.
  size?: number;
  number?: number;
  totalElements?: number;
  totalPages?: number;
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

function isPageMetadata(value: unknown): value is NonNullable<SpringPageEnvelope<unknown>["page"]> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return ["size", "number", "totalElements", "totalPages"].every(
    (field) => typeof candidate[field] === "number" && Number.isFinite(candidate[field])
  );
}

export function toProgramPage(envelope: SpringPageEnvelope<Program>): ProgramPage {
  if (!envelope || !Array.isArray(envelope.content)) {
    throw new Error("Program catalog response does not contain a content array");
  }

  const programs = envelope.content;
  const rootMeta = {
    size: envelope.size,
    number: envelope.number,
    totalElements: envelope.totalElements,
    totalPages: envelope.totalPages
  };
  const meta = isPageMetadata(envelope.page)
    ? envelope.page
    : isPageMetadata(rootMeta)
      ? rootMeta
      : null;

  if (!meta) {
    throw new Error("Program catalog response does not contain pagination metadata");
  }

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

/** GET /api/admin/programs — полный каталог, включая неактивные записи. */
export async function listAdminPrograms(
  pagination: ProgramPageRequest = {},
  signal?: AbortSignal
) {
  const query = toSearchParams({}, pagination).toString();
  const envelope = await authorizedRequestJson<SpringPageEnvelope<Program>>(
    `/admin/programs?${query}`,
    { signal }
  );
  return toProgramPage(envelope);
}

/** DELETE /api/admin/programs/{id}. */
export function deleteProgram(programId: number) {
  return authorizedJsonBody<void>("DELETE", `/admin/programs/${programId}`);
}

export type ProgramAnalyticsEventType = "VIEW" | "CLICK";

/** Public engagement event; analytics failures must never block navigation. */
export function recordProgramEvent(programId: number, type: ProgramAnalyticsEventType) {
  return requestJson<void>(`/programs/${programId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type })
  });
}

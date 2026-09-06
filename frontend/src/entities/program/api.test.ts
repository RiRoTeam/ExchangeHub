import { afterEach, describe, expect, it, vi } from "vitest";
import type { Program } from "../../shared/types/program";
import { listPrograms, PROGRAMS_PAGE_SIZE } from "./api";

const program: Program = {
  id: 42,
  title: "Research exchange",
  description: "A representative program.",
  country: "Estonia",
  type: "EXCHANGE",
  deadline: "2030-05-01",
  url: "https://example.com/programs/42",
  status: "ACTIVE",
  createdAt: "2026-01-15T12:00:00Z"
};

/**
 * Форма ответа снята с работающего бэка:
 * PageSerializationMode.VIA_DTO кладёт метаданные во вложенный `page`.
 */
function programPage(content: Program[], meta: Partial<{
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}> = {}) {
  return {
    content,
    page: {
      size: PROGRAMS_PAGE_SIZE,
      number: 0,
      totalElements: content.length,
      totalPages: content.length ? 1 : 0,
      ...meta
    }
  };
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

function urlOf(fetchMock: ReturnType<typeof vi.fn>, call = 0) {
  return fetchMock.mock.calls[call][0] as string;
}

describe("entities/program/api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("нормализует конверт Spring в плоскую страницу", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse(programPage([program], { number: 2, totalElements: 30, totalPages: 3 }))
      )
    );

    await expect(listPrograms({}, { page: 2 })).resolves.toEqual({
      programs: [program],
      page: 2,
      size: PROGRAMS_PAGE_SIZE,
      totalElements: 30,
      totalPages: 3
    });
  });

  it("всегда передаёт page и size", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(programPage([])));
    vi.stubGlobal("fetch", fetchMock);

    await listPrograms({});

    expect(urlOf(fetchMock)).toBe(`/api/programs?page=0&size=${PROGRAMS_PAGE_SIZE}`);
  });

  it("передаёт фильтры вместе с номером страницы", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(programPage([program])));
    vi.stubGlobal("fetch", fetchMock);

    await listPrograms(
      { type: "EXCHANGE", country: " Estonia ", query: " research lab " },
      { page: 3, size: 5 }
    );

    expect(urlOf(fetchMock)).toBe(
      "/api/programs?type=EXCHANGE&country=Estonia&q=research+lab&page=3&size=5"
    );
  });

  it("отрицательный номер страницы зажимается в ноль", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(programPage([])));
    vi.stubGlobal("fetch", fetchMock);

    await listPrograms({}, { page: -1 });

    expect(urlOf(fetchMock)).toContain("page=0");
  });

  it("пустая страница даёт пустой список и нулевые счётчики", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(programPage([]))));

    await expect(listPrograms({})).resolves.toMatchObject({
      programs: [],
      totalElements: 0,
      totalPages: 0
    });
  });

  it("переживает плоский конверт, если режим сериализации на бэке поменяют", async () => {
    // Без запасного пути счётчик показал бы undefined.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(jsonResponse({ content: [program] }))
    );

    await expect(listPrograms({})).resolves.toMatchObject({
      programs: [program],
      totalElements: 1,
      totalPages: 1
    });
  });
});

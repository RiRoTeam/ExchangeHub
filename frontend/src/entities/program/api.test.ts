import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Program } from "../../shared/types/program";
import {
  deleteProgram,
  listPrograms,
  PROGRAMS_PAGE_SIZE,
  updateProgram
} from "./api";
import {
  registerAuthBridge,
  unregisterAuthBridge,
  type AuthBridge
} from "../../shared/api/authBridge";

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

describe("админские операции над программой", () => {
  let bridge: AuthBridge;

  beforeEach(() => {
    bridge = {
      getAccessToken: () => "admin-token",
      refreshAccessToken: async () => null,
      onSessionExpired: () => {}
    };
    registerAuthBridge(bridge);
  });

  afterEach(() => {
    unregisterAuthBridge(bridge);
  });

  it("updateProgram шлёт PUT с телом и токеном", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(program));
    vi.stubGlobal("fetch", fetchMock);

    const draft = {
      title: "Renamed",
      description: "Updated description.",
      country: "Estonia",
      type: "EXCHANGE" as const,
      deadline: "2030-06-01",
      url: null
    };

    await updateProgram(42, draft);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/programs/42");
    expect(init.method).toBe("PUT");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer admin-token");
    expect(JSON.parse(init.body as string)).toEqual(draft);
  });

  it("deleteProgram шлёт DELETE без тела", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(null, { status: 204 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await deleteProgram(7);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/programs/7");
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
  });
});

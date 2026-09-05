import { afterEach, describe, expect, it, vi } from "vitest";
import type { Program } from "../../shared/types/program";
import { listPrograms, type SpringPage } from "./api";

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

function programPage(content: Program[]): SpringPage<Program> {
  return {
    content,
    pageable: {
      pageNumber: 0,
      pageSize: 20,
      sort: { empty: false, sorted: true, unsorted: false },
      offset: 0,
      paged: true,
      unpaged: false
    },
    last: true,
    totalElements: content.length,
    totalPages: content.length === 0 ? 0 : 1,
    size: 20,
    number: 0,
    sort: { empty: false, sorted: true, unsorted: false },
    first: true,
    numberOfElements: content.length,
    empty: content.length === 0
  };
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

describe("entities/program/api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("извлекает программы из content пагинированного ответа Spring", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(programPage([program])));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listPrograms({})).resolves.toEqual([program]);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/programs");
  });

  it("возвращает пустой массив для пустой страницы", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(programPage([]))));

    await expect(listPrograms({})).resolves.toEqual([]);
  });

  it("передаёт заполненные фильтры как query parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(programPage([program])));
    vi.stubGlobal("fetch", fetchMock);

    await listPrograms({ type: "EXCHANGE", country: " Estonia ", query: " research lab " });

    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/programs?type=EXCHANGE&country=Estonia&q=research+lab"
    );
  });
});

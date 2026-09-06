import { describe, expect, it } from "vitest";
import { filterFavorites } from "./lib";
import type { Program } from "../../shared/types/program";

function program(overrides: Partial<Program>): Program {
  return {
    id: 1,
    title: "Summer research exchange",
    description: "Six weeks in a molecular biology lab.",
    country: "Estonia",
    type: "EXCHANGE",
    deadline: null,
    url: null,
    status: "ACTIVE",
    createdAt: "2026-08-01T10:00:00Z",
    ...overrides
  };
}

const programs = [
  program({ id: 1, title: "Summer research exchange", country: "Estonia" }),
  program({ id: 2, title: "Winter internship", country: "Portugal", description: "Frontend work." }),
  program({ id: 3, title: "Design residency", country: "Latvia", description: "Studio in Riga." })
];

describe("filterFavorites", () => {
  it("пустой запрос возвращает всё как есть", () => {
    expect(filterFavorites(programs, "")).toBe(programs);
    expect(filterFavorites(programs, "   ")).toBe(programs);
  });

  it("ищет по названию без учёта регистра", () => {
    expect(filterFavorites(programs, "WINTER").map((p) => p.id)).toEqual([2]);
  });

  it("ищет по стране", () => {
    expect(filterFavorites(programs, "latvia").map((p) => p.id)).toEqual([3]);
  });

  it("ищет по описанию", () => {
    expect(filterFavorites(programs, "frontend").map((p) => p.id)).toEqual([2]);
  });

  it("находит по частичному совпадению", () => {
    expect(filterFavorites(programs, "res").map((p) => p.id)).toEqual([1, 3]);
  });

  it("игнорирует пробелы по краям запроса", () => {
    expect(filterFavorites(programs, "  riga  ").map((p) => p.id)).toEqual([3]);
  });

  it("на отсутствие совпадений возвращает пустой список", () => {
    expect(filterFavorites(programs, "zzz")).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { getPageItems, PAGE_GAP } from "./pagination";

describe("getPageItems", () => {
  it("без страниц ничего не рисуем", () => {
    expect(getPageItems(0, 0)).toEqual([]);
  });

  it("одна страница", () => {
    expect(getPageItems(0, 1)).toEqual([0]);
  });

  it("короткий ряд показывает всё без многоточий", () => {
    expect(getPageItems(0, 5)).toEqual([0, 1, 2, 3, 4]);
  });

  it("в начале длинного ряда многоточие только справа", () => {
    expect(getPageItems(0, 20)).toEqual([0, 1, PAGE_GAP, 19]);
  });

  it("в середине многоточия с обеих сторон", () => {
    expect(getPageItems(10, 20)).toEqual([0, PAGE_GAP, 9, 10, 11, PAGE_GAP, 19]);
  });

  it("в конце многоточие только слева", () => {
    expect(getPageItems(19, 20)).toEqual([0, PAGE_GAP, 18, 19]);
  });

  it("разрыв в одну страницу заменяется самой страницей, а не многоточием", () => {
    // «0 … 2 3 4» было бы длиннее и хуже, чем «0 1 2 3 4»
    expect(getPageItems(3, 6)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("siblingCount расширяет окно вокруг текущей", () => {
    expect(getPageItems(10, 20, 2)).toEqual([0, PAGE_GAP, 8, 9, 10, 11, 12, PAGE_GAP, 19]);
  });

  it("выход за границы зажимается", () => {
    expect(getPageItems(-5, 3)).toEqual([0, 1, 2]);
    expect(getPageItems(99, 3)).toEqual([0, 1, 2]);
  });

  it("номера не повторяются и идут по возрастанию", () => {
    const items = getPageItems(1, 10).filter((item): item is number => item !== PAGE_GAP);

    expect(new Set(items).size).toBe(items.length);
    expect([...items].sort((a, b) => a - b)).toEqual(items);
  });
});

import { describe, expect, it } from "vitest";
import { buildLinePath, buildScale, buildYTicks, niceCeiling } from "./chart";

describe("niceCeiling", () => {
  it("округляет вверх до круглого", () => {
    expect(niceCeiling(47)).toBe(50);
    expect(niceCeiling(94)).toBe(100);
    expect(niceCeiling(7)).toBe(10);
    expect(niceCeiling(120)).toBe(200);
  });

  it("точные значения не раздувает", () => {
    expect(niceCeiling(100)).toBe(100);
    expect(niceCeiling(5)).toBe(5);
  });

  it("ноль и отрицательные дают единицу — делить на ноль нельзя", () => {
    expect(niceCeiling(0)).toBe(1);
    expect(niceCeiling(-5)).toBe(1);
  });
});

describe("buildYTicks", () => {
  it("подписи от нуля до круглого максимума", () => {
    expect(buildYTicks(47)).toEqual([0, 13, 25, 38, 50]);
  });

  it("на пустых данных не падает", () => {
    expect(buildYTicks(0)).toEqual([0, 0, 1, 1, 1]);
  });
});

describe("buildScale", () => {
  it("растягивает точки на всю ширину", () => {
    const scale = buildScale(3, 100, 200, 100);

    expect(scale.toX(0)).toBe(0);
    expect(scale.toX(2)).toBe(200);
  });

  it("единственную точку ставит по центру", () => {
    expect(buildScale(1, 10, 200, 100).toX(0)).toBe(100);
  });

  it("ноль внизу, максимум вверху", () => {
    const scale = buildScale(2, 100, 200, 100);

    expect(scale.toY(0)).toBe(100);
    expect(scale.toY(100)).toBe(0);
  });

  it("нулевой максимум не даёт NaN", () => {
    expect(buildScale(2, 0, 200, 100).toY(0)).toBe(100);
  });
});

describe("buildLinePath", () => {
  it("строит ломаную", () => {
    const scale = buildScale(3, 100, 200, 100);

    expect(buildLinePath([0, 50, 100], scale)).toBe(
      "M 0.00 100.00 L 100.00 50.00 L 200.00 0.00"
    );
  });

  it("пустые данные дают пустой путь", () => {
    expect(buildLinePath([], buildScale(0, 0, 200, 100))).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import {
  adminRoutes,
  appRoutes,
  buildPath,
  findRouteByPath,
  matchRoutePath,
  programDetailPath,
  userRoutes
} from "./routes";

describe("matchRoutePath", () => {
  it("матчит статический путь", () => {
    expect(matchRoutePath("/programs", "/programs")).toEqual({});
  });

  it("не матчит чужой путь", () => {
    expect(matchRoutePath("/programs", "/favorites")).toBeNull();
  });

  it("не матчит путь другой длины", () => {
    expect(matchRoutePath("/programs", "/programs/42")).toBeNull();
    expect(matchRoutePath("/programs/:id", "/programs")).toBeNull();
    expect(matchRoutePath("/programs/:id", "/programs/42/edit")).toBeNull();
  });

  it("вытаскивает динамический сегмент", () => {
    expect(matchRoutePath("/programs/:id", "/programs/42")).toEqual({ id: "42" });
  });

  it("декодирует значение параметра", () => {
    expect(matchRoutePath("/programs/:id", "/programs/a%20b")).toEqual({ id: "a b" });
  });

  it("матчит несколько параметров", () => {
    expect(matchRoutePath("/a/:x/b/:y", "/a/1/b/2")).toEqual({ x: "1", y: "2" });
  });
});

describe("findRouteByPath", () => {
  it("статический маршрут выигрывает у динамического", () => {
    // /programs не должен перехватываться шаблоном /programs/:id
    expect(findRouteByPath("/programs")?.route.key).toBe("programs");
  });

  it("находит карточку программы и её id", () => {
    const match = findRouteByPath("/programs/42");

    expect(match?.route.key).toBe("programDetail");
    expect(match?.params).toEqual({ id: "42" });
  });

  it("отдаёт null на несуществующем пути", () => {
    expect(findRouteByPath("/nope")).toBeNull();
    expect(findRouteByPath("/programs/42/extra")).toBeNull();
  });

  it("нецифровой id всё равно матчится — валидация на странице", () => {
    // Роутер не знает про типы; страница сама решает, что делать с мусором.
    expect(findRouteByPath("/programs/abc")?.route.key).toBe("programDetail");
  });
});

describe("buildPath", () => {
  it("подставляет параметры", () => {
    expect(buildPath("/programs/:id", { id: 42 })).toBe("/programs/42");
  });

  it("оставляет статический шаблон как есть", () => {
    expect(buildPath("/programs")).toBe("/programs");
  });

  it("кидает понятную ошибку на пропущенном параметре", () => {
    expect(() => buildPath("/programs/:id")).toThrow(/Missing route param "id"/);
  });

  it("programDetailPath собирает путь, который матчится обратно", () => {
    const path = programDetailPath(7);

    expect(path).toBe("/programs/7");
    expect(findRouteByPath(path)?.params).toEqual({ id: "7" });
  });
});

describe("навигационные списки", () => {
  it("скрытые маршруты не попадают в навигацию", () => {
    expect(userRoutes.some((route) => route.key === "programDetail")).toBe(false);
    expect(userRoutes.every((route) => !route.hiddenInNav)).toBe(true);
    expect(adminRoutes.every((route) => !route.hiddenInNav)).toBe(true);
  });

  it("каталог в навигации остался", () => {
    expect(userRoutes.some((route) => route.key === "programs")).toBe(true);
  });

  it("ключи маршрутов уникальны", () => {
    const keys = appRoutes.map((route) => route.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

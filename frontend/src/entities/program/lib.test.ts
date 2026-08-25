import { describe, expect, it } from "vitest";
import {
  differenceInCalendarDays,
  formatDeadlineBadge,
  getDeadlineState,
  isRecentlyAdded,
  parseApiDate
} from "./lib";

// Фиксированное "сейчас": вечер, чтобы поймать ошибки сравнения по миллисекундам,
// а не по календарным дням.
const NOW = new Date("2026-08-16T22:40:00");

function daysFromNow(days: number) {
  const date = new Date(NOW);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

describe("parseApiDate", () => {
  it("читает LocalDate в локальном календаре, а не в UTC", () => {
    // new Date("2027-05-01") — это UTC-полночь, в UTC+7 она превращается
    // в 07:00 того же дня; важно, чтобы номер дня не уехал.
    expect(parseApiDate("2027-05-01")?.getDate()).toBe(1);
    expect(parseApiDate("2027-05-01")?.getMonth()).toBe(4);
  });

  it("читает Instant", () => {
    expect(parseApiDate("2026-08-16T10:00:00Z")).toBeInstanceOf(Date);
  });

  it("на мусоре возвращает null", () => {
    expect(parseApiDate("не дата")).toBeNull();
  });
});

describe("differenceInCalendarDays", () => {
  it("считает календарные дни, игнорируя время суток", () => {
    const lateEvening = new Date("2026-08-16T23:59:00");
    const earlyMorning = new Date("2026-08-17T00:01:00");

    // Разница две минуты, но день разный.
    expect(differenceInCalendarDays(earlyMorning, lateEvening)).toBe(1);
  });

  it("отрицательна для прошлого", () => {
    expect(differenceInCalendarDays(new Date("2026-08-14T10:00:00"), NOW)).toBe(-2);
  });
});

describe("isRecentlyAdded", () => {
  it("сегодня — новое", () => {
    expect(isRecentlyAdded("2026-08-16T09:00:00", NOW)).toBe(true);
  });

  it("шесть дней назад — ещё новое", () => {
    expect(isRecentlyAdded(daysFromNow(-6), NOW)).toBe(true);
  });

  it("семь дней назад — уже нет", () => {
    expect(isRecentlyAdded(daysFromNow(-7), NOW)).toBe(false);
  });

  it("месяц назад — нет", () => {
    expect(isRecentlyAdded(daysFromNow(-30), NOW)).toBe(false);
  });

  it("дата из будущего (часы клиента отстают) считается новой", () => {
    expect(isRecentlyAdded(daysFromNow(1), NOW)).toBe(true);
  });

  it("мусор не роняет и не помечает как новое", () => {
    expect(isRecentlyAdded("не дата", NOW)).toBe(false);
  });
});

describe("getDeadlineState", () => {
  it("null — состояния нет", () => {
    expect(getDeadlineState(null, NOW)).toEqual({ kind: "none" });
  });

  it("вчера — прошёл", () => {
    expect(getDeadlineState(daysFromNow(-1), NOW)).toEqual({ kind: "passed", daysAgo: 1 });
  });

  it("сегодня — today, а не passed", () => {
    // Крайний случай: сейчас 22:40, дедлайн сегодня — он ещё не прошёл.
    expect(getDeadlineState(daysFromNow(0), NOW)).toEqual({ kind: "today" });
  });

  it("до недели включительно — срочно", () => {
    expect(getDeadlineState(daysFromNow(1), NOW)).toEqual({ kind: "urgent", daysLeft: 1 });
    expect(getDeadlineState(daysFromNow(7), NOW)).toEqual({ kind: "urgent", daysLeft: 7 });
  });

  it("от восьми до тридцати дней — приближается", () => {
    expect(getDeadlineState(daysFromNow(8), NOW)).toEqual({ kind: "soon", daysLeft: 8 });
    expect(getDeadlineState(daysFromNow(30), NOW)).toEqual({ kind: "soon", daysLeft: 30 });
  });

  it("дальше тридцати — далеко", () => {
    expect(getDeadlineState(daysFromNow(31), NOW)).toEqual({ kind: "far", daysLeft: 31 });
  });
});

describe("formatDeadlineBadge", () => {
  it("подписывает срочные состояния", () => {
    expect(formatDeadlineBadge(getDeadlineState(daysFromNow(-3), NOW))).toBe("Deadline passed");
    expect(formatDeadlineBadge(getDeadlineState(daysFromNow(0), NOW))).toBe("Deadline today");
    expect(formatDeadlineBadge(getDeadlineState(daysFromNow(1), NOW))).toBe("1 day left");
    expect(formatDeadlineBadge(getDeadlineState(daysFromNow(5), NOW))).toBe("5 days left");
  });

  it("для далёкого дедлайна и его отсутствия плашки нет", () => {
    expect(formatDeadlineBadge(getDeadlineState(daysFromNow(60), NOW))).toBeNull();
    expect(formatDeadlineBadge(getDeadlineState(null, NOW))).toBeNull();
  });
});

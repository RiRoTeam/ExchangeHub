/**
 * Доменные вычисления по датам программы.
 *
 * Всё принимает `now` параметром, а не читает часы внутри: иначе тесты
 * зависели бы от реального времени и рано или поздно начали моргать.
 */

/** Сколько дней программа считается новой. */
export const RECENT_DAYS = 7;

/** До скольких дней дедлайн считается срочным. */
export const URGENT_DAYS = 7;

/** До скольких дней дедлайн показываем как приближающийся. */
export const SOON_DAYS = 30;

export type DeadlineState =
  | { kind: "none" }
  | { kind: "passed"; daysAgo: number }
  | { kind: "today" }
  | { kind: "urgent"; daysLeft: number }
  | { kind: "soon"; daysLeft: number }
  | { kind: "far"; daysLeft: number };

/**
 * Парсит дату из API.
 * `deadline` приходит как LocalDate ("2027-05-01"), `createdAt` — как Instant.
 * Голая дата без времени в JS парсится как UTC-полночь, поэтому в часовых
 * поясах восточнее Гринвича она уезжает на день назад. Дописываем время,
 * чтобы дата читалась в локальном календаре пользователя.
 */
export function parseApiDate(value: string): Date | null {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = new Date(isDateOnly ? `${value}T00:00:00` : value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * Разница в календарных днях, а не в миллисекундах.
 * «Завтра в 00:30» и «завтра в 23:30» — одинаково один день.
 */
export function differenceInCalendarDays(target: Date, base: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;

  return Math.round((startOfDay(target).getTime() - startOfDay(base).getTime()) / msPerDay);
}

/** Программа добавлена за последние RECENT_DAYS дней. */
export function isRecentlyAdded(createdAt: string, now: Date = new Date()) {
  const created = parseApiDate(createdAt);

  if (!created) {
    return false;
  }

  const daysAgo = differenceInCalendarDays(now, created);

  // daysAgo < 0 — часы клиента отстают от сервера; считаем такое свежим.
  return daysAgo < RECENT_DAYS;
}

export function getDeadlineState(deadline: string | null, now: Date = new Date()): DeadlineState {
  if (!deadline) {
    return { kind: "none" };
  }

  const parsed = parseApiDate(deadline);

  if (!parsed) {
    return { kind: "none" };
  }

  const daysLeft = differenceInCalendarDays(parsed, now);

  if (daysLeft < 0) {
    return { kind: "passed", daysAgo: -daysLeft };
  }

  if (daysLeft === 0) {
    return { kind: "today" };
  }

  if (daysLeft <= URGENT_DAYS) {
    return { kind: "urgent", daysLeft };
  }

  if (daysLeft <= SOON_DAYS) {
    return { kind: "soon", daysLeft };
  }

  return { kind: "far", daysLeft };
}

function pluralizeDays(count: number) {
  return count === 1 ? "1 day" : `${count} days`;
}

/** Короткая подпись для плашки. null — плашку показывать не надо. */
export function formatDeadlineBadge(state: DeadlineState): string | null {
  switch (state.kind) {
    case "passed":
      return "Deadline passed";
    case "today":
      return "Deadline today";
    case "urgent":
      return `${pluralizeDays(state.daysLeft)} left`;
    case "soon":
      return `${pluralizeDays(state.daysLeft)} left`;
    default:
      // "far" и "none" — плашка только зашумила бы карточку.
      return null;
  }
}

/** Человекочитаемая дата или заглушка, если её нет. */
export function formatProgramDate(value: string | null, fallback = "Not specified") {
  if (!value) {
    return fallback;
  }

  const parsed = parseApiDate(value);

  return parsed ? parsed.toLocaleDateString() : value;
}

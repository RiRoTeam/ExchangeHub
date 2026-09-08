import { authorizedRequestJson } from "../../shared/api/http";
import type { AdminAnalytics } from "../../shared/types/analytics";

/** GET /api/admin/analytics — сводка по каталогу и вовлечённости (только ADMIN). */
export function getAdminAnalytics(signal?: AbortSignal) {
  return authorizedRequestJson<AdminAnalytics>("/admin/analytics", { signal });
}

// Совместимость с тестом из main, который импортировал тип отсюда.
export type { AdminAnalytics } from "../../shared/types/analytics";

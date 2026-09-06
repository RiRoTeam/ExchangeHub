import { authorizedRequestJson } from "../../shared/api/http";
import type { Program } from "../../shared/types/program";

/** GET /api/users/me/favorites — избранное целиком, без пагинации. */
export function listFavorites(signal?: AbortSignal) {
  return authorizedRequestJson<Program[]>("/users/me/favorites", { signal });
}

/** POST /api/users/me/favorites/{id} — 204. Идемпотентно, 404 если программы нет. */
export function addFavorite(programId: number) {
  return authorizedRequestJson<void>(`/users/me/favorites/${programId}`, {
    method: "POST"
  });
}

/** DELETE /api/users/me/favorites/{id} — 204. Идемпотентно. */
export function removeFavorite(programId: number) {
  return authorizedRequestJson<void>(`/users/me/favorites/${programId}`, {
    method: "DELETE"
  });
}

import { authorizedJsonBody, authorizedRequestJson } from "../../shared/api/http";
import type { AdminUser, UserProfile, UserRole } from "../../shared/types/user";

export type UpdateProfileRequest = {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
};

/** PATCH /api/users/me — смена имени и/или пароля. */
export function updateProfile(request: UpdateProfileRequest) {
  return authorizedJsonBody<UserProfile>("PATCH", "/users/me", request);
}

/** GET /api/admin/users — список пользователей с ролями (только ADMIN). */
export function listAdminUsers(signal?: AbortSignal) {
  return authorizedRequestJson<AdminUser[]>("/admin/users", { signal });
}

/**
 * PATCH /api/admin/users/{id}/role — сменить роль (только ADMIN).
 * Бэк отзывает refresh-токены пользователя и не даёт разжаловать
 * последнего администратора (409).
 */
export function changeUserRole(id: number, role: UserRole) {
  return authorizedJsonBody<AdminUser>("PATCH", `/admin/users/${id}/role`, { role });
}

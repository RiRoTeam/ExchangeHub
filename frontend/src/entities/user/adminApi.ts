import { authorizedJsonBody, authorizedRequestJson } from "../../shared/api/http";
import type { UserRole } from "../../shared/types/user";

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
};

export function listAdminUsers(signal?: AbortSignal) {
  return authorizedRequestJson<AdminUser[]>("/admin/users", { signal });
}

export function changeUserRole(userId: number, role: UserRole) {
  return authorizedJsonBody<AdminUser>("PATCH", `/admin/users/${userId}/role`, { role });
}

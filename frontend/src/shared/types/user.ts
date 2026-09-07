export type UserRole = "USER" | "ADMIN";

export type UserProfile = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
};

/** Строка списка пользователей в админке: AdminUserResponse на бэке. */
export type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
};

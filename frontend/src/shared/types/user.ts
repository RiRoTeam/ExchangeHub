export type UserRole = "USER" | "ADMIN";

export type UserProfile = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
};

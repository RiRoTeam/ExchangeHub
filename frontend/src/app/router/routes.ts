export type RouteScope = "public" | "user" | "admin";

export type AppRouteKey =
  | "login"
  | "programs"
  | "favorites"
  | "suggestProgram"
  | "profile"
  | "adminPrograms"
  | "adminReview"
  | "adminAddProgram"
  | "adminManageAdmins";

export type AppRouteDefinition = {
  key: AppRouteKey;
  path: string;
  title: string;
  scope: RouteScope;
  navigationLabel: string;
};

export const appRoutes: AppRouteDefinition[] = [
  {
    key: "login",
    path: "/login",
    title: "Login",
    scope: "public",
    navigationLabel: "login"
  },
  {
    key: "programs",
    path: "/programs",
    title: "All programs",
    scope: "user",
    navigationLabel: "all programs"
  },
  {
    key: "favorites",
    path: "/favorites",
    title: "Favorite programs",
    scope: "user",
    navigationLabel: "favorite programs"
  },
  {
    key: "suggestProgram",
    path: "/suggest-program",
    title: "Suggest program",
    scope: "user",
    navigationLabel: "suggest program"
  },
  {
    key: "profile",
    path: "/profile",
    title: "Profile",
    scope: "user",
    navigationLabel: "profile"
  },
  {
    key: "adminPrograms",
    path: "/admin/programs",
    title: "All programs",
    scope: "admin",
    navigationLabel: "all programs"
  },
  {
    key: "adminReview",
    path: "/admin/review",
    title: "Review programs",
    scope: "admin",
    navigationLabel: "review programs"
  },
  {
    key: "adminAddProgram",
    path: "/admin/add-program",
    title: "Add program",
    scope: "admin",
    navigationLabel: "add program"
  },
  {
    key: "adminManageAdmins",
    path: "/admin/manage-admins",
    title: "Manage admins",
    scope: "admin",
    navigationLabel: "manage admins"
  }
];

export const publicRoutes = appRoutes.filter((route) => route.scope === "public");
export const userRoutes = appRoutes.filter((route) => route.scope === "user");
export const adminRoutes = appRoutes.filter((route) => route.scope === "admin");

export function findRouteByPath(pathname: string) {
  return appRoutes.find((route) => route.path === pathname) ?? null;
}

export function getDefaultPathForRole(role: "USER" | "ADMIN") {
  return role === "ADMIN" ? "/admin/programs" : "/programs";
}

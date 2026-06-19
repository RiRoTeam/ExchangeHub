import { useEffect, type ReactElement } from "react";
import { useAuth } from "../providers/AuthProvider";
import { AdminAddProgramPage } from "../../pages/admin-add-program/AdminAddProgramPage";
import { AdminManageAdminsPage } from "../../pages/admin-manage-admins/AdminManageAdminsPage";
import { AdminProgramsPage } from "../../pages/admin-programs/AdminProgramsPage";
import { AdminReviewPage } from "../../pages/admin-review/AdminReviewPage";
import { FavoritesPage } from "../../pages/favorites/FavoritesPage";
import { LoginPage } from "../../pages/login/LoginPage";
import { ProfilePage } from "../../pages/profile/ProfilePage";
import { ProgramsPage } from "../../pages/programs/ProgramsPage";
import { SuggestProgramPage } from "../../pages/suggest-program/SuggestProgramPage";
import { findRouteByPath, getDefaultPathForRole, type AppRouteKey } from "./routes";
import { useRouter } from "./RouterProvider";

const routeComponents: Record<AppRouteKey, ReactElement> = {
  login: <LoginPage />,
  programs: <ProgramsPage />,
  favorites: <FavoritesPage />,
  suggestProgram: <SuggestProgramPage />,
  profile: <ProfilePage />,
  adminPrograms: <AdminProgramsPage />,
  adminReview: <AdminReviewPage />,
  adminAddProgram: <AdminAddProgramPage />,
  adminManageAdmins: <AdminManageAdminsPage />
};

function RouteStatus({ title, message }: { title: string; message: string }) {
  return (
    <main className="route-status">
      <div className="route-status__card">
        <h1>{title}</h1>
        <p>{message}</p>
      </div>
    </main>
  );
}

export function AppRouter() {
  const { pathname, navigate } = useRouter();
  const { status, session } = useAuth();
  const matchedRoute = findRouteByPath(pathname);
  const isAuthenticated = status === "authenticated" && !!session;

  let redirectPath: string | null = null;

  if (pathname === "/") {
    redirectPath = isAuthenticated && session
      ? getDefaultPathForRole(session.user.role)
      : "/login";
  } else if (matchedRoute) {
    if (matchedRoute.scope === "public" && isAuthenticated && session) {
      redirectPath = getDefaultPathForRole(session.user.role);
    }

    if ((matchedRoute.scope === "user" || matchedRoute.scope === "admin") && status === "anonymous") {
      redirectPath = "/login";
    }

    if (matchedRoute.scope === "user" && session?.user.role === "ADMIN") {
      redirectPath = getDefaultPathForRole(session.user.role);
    }

    if (matchedRoute.scope === "admin" && session?.user.role === "USER") {
      redirectPath = getDefaultPathForRole(session.user.role);
    }
  }

  useEffect(() => {
    if (redirectPath) {
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, redirectPath]);

  if (status === "bootstrapping") {
    return (
      <RouteStatus
        title="Opening ExchangeHub"
        message="We’re restoring your session and preparing the app."
      />
    );
  }

  if (redirectPath) {
    return (
      <RouteStatus
        title="Taking you to the right place"
        message="One moment while we redirect you."
      />
    );
  }

  if (!matchedRoute) {
    return (
      <RouteStatus
        title="Page not found"
        message="This route doesn’t exist yet in the current frontend build."
      />
    );
  }

  return routeComponents[matchedRoute.key];
}

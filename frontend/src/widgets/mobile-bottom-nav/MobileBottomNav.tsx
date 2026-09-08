import { guestRoutes, userRoutes, type AppRouteKey } from "../../app/router/routes";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../app/providers/AuthProvider";
import { useRouter } from "../../app/router/RouterProvider";

type MobileBottomNavProps = {
  currentRoute: AppRouteKey;
};

export function MobileBottomNav({ currentRoute }: MobileBottomNavProps) {
  const { navigate } = useRouter();
  const { t } = useTranslation();
  const { status } = useAuth();

  // Гостю показываем каталог и вход: остальные страницы всё равно закрыты.
  const routes = status === "authenticated" ? userRoutes : guestRoutes;

  return (
    <nav aria-label={t("nav.allPrograms")} className="mobile-nav">
      <ul className="mobile-nav__list">
        {routes.map((route) => (
          <li key={route.key}>
            <button
              className={`mobile-nav__button ${route.key === currentRoute ? "mobile-nav__button--active" : ""}`}
              onClick={() => navigate(route.path)}
              type="button"
            >
              {t(route.navigationLabel as never)}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

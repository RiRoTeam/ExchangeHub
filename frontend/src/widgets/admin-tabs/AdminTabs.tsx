import { adminRoutes, type AppRouteKey } from "../../app/router/routes";
import { useTranslation } from "react-i18next";
import { useRouter } from "../../app/router/RouterProvider";

type AdminTabsProps = {
  currentRoute: AppRouteKey;
};

export function AdminTabs({ currentRoute }: AdminTabsProps) {
  const { navigate } = useRouter();
  const { t } = useTranslation();

  return (
    <nav aria-label={t("nav.reviewPrograms")} className="nav-tabs">
      <ul className="nav-tabs__list">
        {adminRoutes.map((route) => (
          <li key={route.key} className="nav-tabs__item">
            <button
              className={`nav-tabs__button ${route.key === currentRoute ? "nav-tabs__button--active" : ""}`}
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

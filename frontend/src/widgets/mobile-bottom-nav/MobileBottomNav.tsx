import { userRoutes, type AppRouteKey } from "../../app/router/routes";
import { useRouter } from "../../app/router/RouterProvider";

type MobileBottomNavProps = {
  currentRoute: AppRouteKey;
};

export function MobileBottomNav({ currentRoute }: MobileBottomNavProps) {
  const { navigate } = useRouter();

  return (
    <nav aria-label="Mobile navigation" className="mobile-nav">
      <ul className="mobile-nav__list">
        {userRoutes.map((route) => (
          <li key={route.key}>
            <button
              className={`mobile-nav__button ${route.key === currentRoute ? "mobile-nav__button--active" : ""}`}
              onClick={() => navigate(route.path)}
              type="button"
            >
              {route.navigationLabel}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

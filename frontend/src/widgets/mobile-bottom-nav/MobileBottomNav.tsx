import { userRoutes, type AppRouteKey } from "../../app/router/routes";

type MobileBottomNavProps = {
  currentRoute: AppRouteKey;
};

export function MobileBottomNav({ currentRoute }: MobileBottomNavProps) {
  return (
    <nav aria-label="Mobile navigation">
      <ul>
        {userRoutes.map((route) => (
          <li key={route.key}>
            <span>{route.key === currentRoute ? `[${route.navigationLabel}]` : route.navigationLabel}</span>
          </li>
        ))}
      </ul>
    </nav>
  );
}

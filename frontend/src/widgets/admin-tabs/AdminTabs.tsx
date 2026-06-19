import { adminRoutes, type AppRouteKey } from "../../app/router/routes";

type AdminTabsProps = {
  currentRoute: AppRouteKey;
};

export function AdminTabs({ currentRoute }: AdminTabsProps) {
  return (
    <nav aria-label="Admin sections">
      <ul>
        {adminRoutes.map((route) => (
          <li key={route.key}>
            <span>{route.key === currentRoute ? `[${route.navigationLabel}]` : route.navigationLabel}</span>
          </li>
        ))}
      </ul>
    </nav>
  );
}

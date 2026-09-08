/**
 * public        — только для анонимов (страница логина)
 * guest         — для всех, включая анонимов: каталог открывается по ссылке
 * user / admin  — только для своей роли
 * authenticated — для любого залогиненного, роль не важна
 */
export type RouteScope = "public" | "guest" | "user" | "admin" | "authenticated";

export type AppRouteKey =
  | "login"
  | "programs"
  | "programDetail"
  | "favorites"
  | "suggestProgram"
  | "profile"
  | "adminPrograms"
  | "adminReview"
  | "adminAddProgram"
  | "adminManageAdmins"
  | "adminAnalytics";

export type AppRouteDefinition = {
  key: AppRouteKey;
  /** Шаблон пути. Сегмент вида :id — динамический параметр. */
  path: string;
  title: string;
  scope: RouteScope;
  /** Ключ перевода: подпись в навигации. */
  navigationLabel: string;
  /** Не показывать в навигации: страница открывается только по ссылке. */
  hiddenInNav?: boolean;
};

/** Разобранные динамические сегменты пути, например { id: "42" }. */
export type RouteParams = Record<string, string>;

export type RouteMatch = {
  route: AppRouteDefinition;
  params: RouteParams;
};

export const appRoutes: AppRouteDefinition[] = [
  {
    key: "programs",
    path: "/programs",
    title: "All programs",
    // Каталог открыт всем: ссылку с QR-кода читают без регистрации.
    scope: "guest",
    navigationLabel: "nav.allPrograms"
  },
  {
    key: "programDetail",
    path: "/programs/:id",
    title: "Program",
    // Открыта всем, как и каталог: ссылка на конкретную программу должна
    // работать без входа.
    scope: "guest",
    navigationLabel: "nav.allPrograms",
    hiddenInNav: true
  },
  {
    key: "favorites",
    path: "/favorites",
    title: "Favorite programs",
    // Избранное есть у любого, кто вошёл: ручка /api/users/me/favorites
    // роль не проверяет, и админу тоже есть что сохранять.
    scope: "authenticated",
    navigationLabel: "nav.favorites"
  },
  {
    key: "suggestProgram",
    path: "/suggest-program",
    title: "Suggest program",
    scope: "user",
    navigationLabel: "nav.suggestProgram"
  },
  {
    key: "adminPrograms",
    path: "/admin/programs",
    title: "All programs",
    scope: "admin",
    navigationLabel: "nav.allPrograms"
  },
  {
    key: "adminReview",
    path: "/admin/review",
    title: "Review programs",
    scope: "admin",
    navigationLabel: "nav.reviewPrograms"
  },
  {
    key: "adminAddProgram",
    path: "/admin/add-program",
    title: "Add program",
    scope: "admin",
    navigationLabel: "nav.addProgram"
  },
  {
    key: "adminManageAdmins",
    path: "/admin/manage-admins",
    title: "Manage admins",
    scope: "admin",
    navigationLabel: "nav.manageAdmins"
  },
  {
    key: "adminAnalytics",
    path: "/admin/analytics",
    title: "Analytics",
    scope: "admin",
    navigationLabel: "nav.analytics"
  },
  {
    key: "profile",
    path: "/profile",
    title: "Profile",
    scope: "authenticated",
    navigationLabel: "nav.profile"
  },
  // Логин идёт последним: в гостевой навигации первым должен стоять каталог.
  {
    key: "login",
    path: "/login",
    title: "Login",
    scope: "public",
    navigationLabel: "nav.login"
  }
];

function toSegments(pathname: string) {
  return pathname.split("/").filter(Boolean);
}

function isDynamicSegment(segment: string) {
  return segment.startsWith(":");
}

/**
 * Сопоставляет один шаблон с путём.
 * Возвращает параметры (возможно пустые) или null, если не совпало.
 */
export function matchRoutePath(pattern: string, pathname: string): RouteParams | null {
  const patternSegments = toSegments(pattern);
  const pathSegments = toSegments(pathname);

  if (patternSegments.length !== pathSegments.length) {
    return null;
  }

  const params: RouteParams = {};

  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index];
    const pathSegment = pathSegments[index];

    if (isDynamicSegment(patternSegment)) {
      // Пустой сегмент сюда не попадёт — filter(Boolean) их уже убрал.
      params[patternSegment.slice(1)] = decodeURIComponent(pathSegment);
      continue;
    }

    if (patternSegment !== pathSegment) {
      return null;
    }
  }

  return params;
}

function countStaticSegments(route: AppRouteDefinition) {
  return toSegments(route.path).filter((segment) => !isDynamicSegment(segment)).length;
}

/**
 * Ищет маршрут под путь. Статические маршруты выигрывают у динамических,
 * поэтому /programs никогда не перехватится шаблоном /programs/:id.
 */
export function findRouteByPath(pathname: string): RouteMatch | null {
  const matches: RouteMatch[] = [];

  for (const route of appRoutes) {
    const params = matchRoutePath(route.path, pathname);

    if (params) {
      matches.push({ route, params });
    }
  }

  if (!matches.length) {
    return null;
  }

  return matches.sort(
    (left, right) => countStaticSegments(right.route) - countStaticSegments(left.route)
  )[0];
}

/** Подставляет параметры в шаблон: buildPath("/programs/:id", { id: 42 }). */
export function buildPath(pattern: string, params: Record<string, string | number> = {}) {
  return pattern
    .split("/")
    .map((segment) => {
      if (!isDynamicSegment(segment)) {
        return segment;
      }

      const value = params[segment.slice(1)];

      if (value === undefined) {
        throw new Error(`Missing route param "${segment.slice(1)}" for pattern "${pattern}"`);
      }

      return encodeURIComponent(String(value));
    })
    .join("/");
}

export function getRoutePath(key: AppRouteKey, params?: Record<string, string | number>) {
  const route = appRoutes.find((candidate) => candidate.key === key);

  if (!route) {
    throw new Error(`Unknown route key: ${key}`);
  }

  return buildPath(route.path, params);
}

/** Путь до карточки программы — чтобы id не собирали строками по всему коду. */
export function programDetailPath(id: number | string) {
  return getRoutePath("programDetail", { id });
}

function navigable(scope: RouteScope) {
  return appRoutes.filter((route) => {
    if (route.hiddenInNav) {
      return false;
    }

    if (route.scope === scope) {
      return true;
    }

    // Страницы для любого залогиненного видны в обеих навигациях —
    // иначе админу неоткуда узнать, что у него есть профиль (и выход).
    if (route.scope === "authenticated") {
      return scope === "user" || scope === "admin";
    }

    // Общедоступный каталог нужен и гостю, и пользователю. Админу — нет:
    // у него на этом месте свой каталог с черновиками.
    if (route.scope === "guest") {
      return scope === "user";
    }

    // Кнопка входа осмысленна только для гостя.
    if (route.scope === "public") {
      return scope === "guest";
    }

    return false;
  });
}

/**
 * Страницы для любого залогиненного показываем в конце навигации: иначе
 * избранное встало бы у админа перед его собственными вкладками.
 */
function byScopeOrder(left: AppRouteDefinition, right: AppRouteDefinition) {
  const rank = (route: AppRouteDefinition) => (route.scope === "authenticated" ? 1 : 0);

  return rank(left) - rank(right);
}

export const publicRoutes = navigable("public");
export const guestRoutes = navigable("guest").sort(byScopeOrder);
export const userRoutes = navigable("user").sort(byScopeOrder);
export const adminRoutes = navigable("admin").sort(byScopeOrder);

export function getDefaultPathForRole(role: "USER" | "ADMIN") {
  return role === "ADMIN" ? "/admin/programs" : "/programs";
}

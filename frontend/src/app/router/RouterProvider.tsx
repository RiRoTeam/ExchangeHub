import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";

type NavigateOptions = {
  replace?: boolean;
};

type RouterContextValue = {
  pathname: string;
  navigate: (to: string, options?: NavigateOptions) => void;
};

type RouterProviderProps = {
  children: ReactNode;
};

const RouterContext = createContext<RouterContextValue | null>(null);

function normalizePathname(pathname: string) {
  if (!pathname) {
    return "/";
  }

  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export function RouterProvider({ children }: RouterProviderProps) {
  const [pathname, setPathname] = useState(() =>
    normalizePathname(window.location.pathname)
  );

  useEffect(() => {
    function handlePopState() {
      setPathname(normalizePathname(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  function navigate(to: string, options?: NavigateOptions) {
    const nextPathname = normalizePathname(to);

    if (nextPathname === pathname) {
      return;
    }

    if (options?.replace) {
      window.history.replaceState(null, "", nextPathname);
    } else {
      window.history.pushState(null, "", nextPathname);
    }

    window.scrollTo({ top: 0, behavior: "auto" });
    setPathname(nextPathname);
  }

  return (
    <RouterContext.Provider
      value={{
        pathname,
        navigate
      }}
    >
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const context = useContext(RouterContext);

  if (!context) {
    throw new Error("useRouter must be used within RouterProvider");
  }

  return context;
}

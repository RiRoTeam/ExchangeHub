import type { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { FavoritesProvider } from "./FavoritesProvider";
import { RouterProvider } from "../router/RouterProvider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <RouterProvider>
      <AuthProvider>
        {/* Ниже AuthProvider: избранное грузится только после входа. */}
        <FavoritesProvider>{children}</FavoritesProvider>
      </AuthProvider>
    </RouterProvider>
  );
}

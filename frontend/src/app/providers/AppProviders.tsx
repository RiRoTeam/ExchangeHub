import type { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { RouterProvider } from "../router/RouterProvider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <RouterProvider>
      <AuthProvider>{children}</AuthProvider>
    </RouterProvider>
  );
}

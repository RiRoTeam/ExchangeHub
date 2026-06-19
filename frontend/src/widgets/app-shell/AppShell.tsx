import type { ReactNode } from "react";

type AppShellProps = {
  title: string;
  description?: string;
  navigation?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
};

export function AppShell({
  title,
  description,
  navigation,
  aside,
  children
}: AppShellProps) {
  return (
    <main>
      <header>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {navigation}
      </header>

      <section>
        {aside ? <aside>{aside}</aside> : null}
        <div>{children}</div>
      </section>
    </main>
  );
}

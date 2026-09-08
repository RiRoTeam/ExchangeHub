import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../../features/language/LanguageSwitcher";

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
  const { t } = useTranslation();

  return (
    <main className="page-shell">
      <header className="page-shell__header">
        <div className="page-shell__heading">
          <p className="page-shell__eyebrow">{t("common.appName")}</p>
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        <div className="page-shell__toolbar">
          {navigation ? <div className="page-shell__navigation">{navigation}</div> : null}
          <LanguageSwitcher />
        </div>
      </header>

      <section className={`page-shell__content ${aside ? "page-shell__content--with-aside" : ""}`}>
        {aside ? <aside className="page-shell__aside">{aside}</aside> : null}
        <div className="page-shell__main">{children}</div>
      </section>
    </main>
  );
}

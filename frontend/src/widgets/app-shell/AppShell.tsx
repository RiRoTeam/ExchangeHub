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
        {/* Переключатель языка стоит в одной строке с названием продукта:
            отдельной строкой под описанием он торчал сбоку ни к чему не
            прижатый, особенно на узком экране. */}
        <div className="page-shell__topbar">
          <p className="page-shell__eyebrow">{t("common.appName")}</p>
          <LanguageSwitcher />
        </div>

        <div className="page-shell__heading">
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>

        {navigation ? (
          <div className="page-shell__toolbar">
            <div className="page-shell__navigation">{navigation}</div>
          </div>
        ) : null}
      </header>

      <section className={`page-shell__content ${aside ? "page-shell__content--with-aside" : ""}`}>
        {aside ? <aside className="page-shell__aside">{aside}</aside> : null}
        <div className="page-shell__main">{children}</div>
      </section>
    </main>
  );
}

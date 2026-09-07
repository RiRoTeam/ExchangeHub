import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFavorites } from "../../app/providers/FavoritesProvider";
import { filterFavorites } from "../../entities/favorite/lib";
import { ProgramSearch } from "../../features/program/search/ProgramSearch";
import { AppShell } from "../../widgets/app-shell/AppShell";
import { FilterSidebar } from "../../widgets/filter-sidebar/FilterSidebar";
import { MobileBottomNav } from "../../widgets/mobile-bottom-nav/MobileBottomNav";
import { ProgramList } from "../../widgets/program-list/ProgramList";

export function FavoritesPage() {
  const { t } = useTranslation();
  const { status, programs, loadError, actionError, reload } = useFavorites();
  const [query, setQuery] = useState("");

  // Бэк фильтрацию избранного не поддерживает, поэтому ищем локально.
  // Список короткий, дебаунс не нужен — запросов он не порождает.
  const visiblePrograms = useMemo(
    () => filterFavorites(programs, query),
    [programs, query]
  );

  const isLoading = status === "loading" || status === "idle";

  function describeCount() {
    if (loadError) {
      return t("favorites.unavailable");
    }

    if (isLoading) {
      return t("favorites.loading");
    }

    if (query.trim()) {
      return t("favorites.matching", {
        visible: visiblePrograms.length,
        total: programs.length
      });
    }

    return t("favorites.saved", { count: programs.length });
  }

  return (
    <AppShell
      title={t("favorites.title")}
      description={t("favorites.description")}
      aside={
        <FilterSidebar title={t("favorites.searchTitle")}>
          <ProgramSearch
            onChange={setQuery}
            placeholder={t("favorites.searchPlaceholder")}
            value={query}
          />
        </FilterSidebar>
      }
      navigation={<MobileBottomNav currentRoute="favorites" />}
    >
      <section className="programs-page__header">
        <div>
          <h2>{t("favorites.heading")}</h2>
          <p>{describeCount()}</p>
        </div>
      </section>

      {actionError ? <div className="error-banner"><p>{actionError}</p></div> : null}

      {loadError ? (
        <div className="error-banner">
          <p>{loadError}</p>
          <button className="secondary-button" onClick={reload} type="button">
            {t("common.retry")}
          </button>
        </div>
      ) : isLoading ? (
        <div className="placeholder-card">{t("favorites.loading")}</div>
      ) : (
        <ProgramList
          emptyMessage={
            query.trim() ? t("favorites.emptyFiltered") : t("favorites.empty")
          }
          programs={visiblePrograms}
        />
      )}
    </AppShell>
  );
}

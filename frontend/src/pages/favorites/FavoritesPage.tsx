import { useMemo, useState } from "react";
import { useFavorites } from "../../app/providers/FavoritesProvider";
import { filterFavorites } from "../../entities/favorite/lib";
import { ProgramSearch } from "../../features/program/search/ProgramSearch";
import { AppShell } from "../../widgets/app-shell/AppShell";
import { FilterSidebar } from "../../widgets/filter-sidebar/FilterSidebar";
import { MobileBottomNav } from "../../widgets/mobile-bottom-nav/MobileBottomNav";
import { ProgramList } from "../../widgets/program-list/ProgramList";

export function FavoritesPage() {
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
      return "Favorites are temporarily unavailable.";
    }

    if (isLoading) {
      return "Loading your favorites...";
    }

    if (query.trim()) {
      return `${visiblePrograms.length} of ${programs.length} saved programs match`;
    }

    return `${programs.length} ${programs.length === 1 ? "saved program" : "saved programs"}`;
  }

  return (
    <AppShell
      title="Favorite programs"
      description="Programs you saved while browsing the catalog."
      aside={
        <FilterSidebar title="Search favorites">
          <ProgramSearch
            onChange={setQuery}
            placeholder="Search your saved programs"
            value={query}
          />
        </FilterSidebar>
      }
      navigation={<MobileBottomNav currentRoute="favorites" />}
    >
      <section className="programs-page__header">
        <div>
          <h2>Saved programs</h2>
          <p>{describeCount()}</p>
        </div>
      </section>

      {actionError ? <div className="error-banner"><p>{actionError}</p></div> : null}

      {loadError ? (
        <div className="error-banner">
          <p>{loadError}</p>
          <button className="secondary-button" onClick={reload} type="button">
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="placeholder-card">Loading your favorites...</div>
      ) : (
        <ProgramList
          emptyMessage={
            query.trim()
              ? "No saved programs match this search."
              : "Nothing saved yet. Tap the heart on any program in the catalog to keep it here."
          }
          programs={visiblePrograms}
        />
      )}
    </AppShell>
  );
}

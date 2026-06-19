import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../shared/api/http";
import type { Program, ProgramType } from "../../shared/types/program";
import { useDebouncedValue } from "../../shared/lib/useDebouncedValue";
import { listPrograms } from "../../entities/program/api";
import { ProgramFilters } from "../../features/program/filters/ProgramFilters";
import { ProgramSearch } from "../../features/program/search/ProgramSearch";
import { AppShell } from "../../widgets/app-shell/AppShell";
import { FilterSidebar } from "../../widgets/filter-sidebar/FilterSidebar";
import { ProgramList } from "../../widgets/program-list/ProgramList";
import { MobileBottomNav } from "../../widgets/mobile-bottom-nav/MobileBottomNav";

function toFriendlyProgramsError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status >= 500) {
      return "We couldn’t load programs right now because the server is having trouble.";
    }

    if (error.status === 400) {
      return "These filters couldn’t be processed. Please adjust them and try again.";
    }
  }

  if (error instanceof TypeError) {
    return "We couldn’t reach ExchangeHub. Check your connection and try again.";
  }

  return "We couldn’t load programs right now. Please try again.";
}

export function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [type, setType] = useState<ProgramType | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);

  const debouncedQuery = useDebouncedValue(query, 350);
  const debouncedCountry = useDebouncedValue(country, 350);

  const activeFilters = useMemo(
    () => ({
      query: debouncedQuery,
      country: debouncedCountry,
      type: type || undefined
    }),
    [debouncedCountry, debouncedQuery, type]
  );

  useEffect(() => {
    const abortController = new AbortController();
    let isActive = true;

    async function loadPrograms() {
      setIsLoading(true);
      setError("");

      try {
        const nextPrograms = await listPrograms(activeFilters, abortController.signal);

        if (isActive) {
          setPrograms(nextPrograms);
        }
      } catch (loadError) {
        if (abortController.signal.aborted) {
          return;
        }

        if (isActive) {
          setPrograms([]);
          setError(toFriendlyProgramsError(loadError));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadPrograms();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [activeFilters, requestVersion]);

  function resetFilters() {
    setQuery("");
    setCountry("");
    setType("");
  }

  function retryLoadingPrograms() {
    setRequestVersion((currentValue) => currentValue + 1);
  }

  return (
    <AppShell
      title="All programs"
      description="Browse current programs, search by keyword, and narrow the list with server-backed filters."
      aside={
        <FilterSidebar>
          <ProgramSearch onChange={setQuery} value={query} />
          <ProgramFilters
            country={country}
            onCountryChange={setCountry}
            onReset={resetFilters}
            onTypeChange={setType}
            type={type}
          />
        </FilterSidebar>
      }
      navigation={<MobileBottomNav currentRoute="programs" />}
    >
      <section className="programs-page__header">
        <div>
          <h2>Program catalog</h2>
          <p>
            {error
              ? "Programs are temporarily unavailable."
              : isLoading
              ? "Loading programs..."
              : `${programs.length} ${programs.length === 1 ? "program" : "programs"} found`}
          </p>
        </div>
      </section>

      {error ? (
        <div className="error-banner">
          <p>{error}</p>
          <button className="secondary-button" onClick={retryLoadingPrograms} type="button">
            Retry
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="placeholder-card">Loading programs...</div>
      ) : error ? null : (
        <ProgramList
          emptyMessage="No programs match these filters yet. Try broadening the search."
          programs={programs}
        />
      )}
    </AppShell>
  );
}

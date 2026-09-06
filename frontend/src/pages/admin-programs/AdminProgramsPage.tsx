import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listPrograms,
  PROGRAMS_PAGE_SIZE,
  updateProgram,
  type ProgramPage
} from "../../entities/program/api";
import { toFriendlyApiError } from "../../shared/api/problem";
import { useDebouncedValue } from "../../shared/lib/useDebouncedValue";
import type { Program, ProgramType } from "../../shared/types/program";
import type { ProgramDraft } from "../../shared/types/submission";
import { ProgramAdminActions } from "../../features/program/admin-actions/ProgramAdminActions";
import { ProgramFilters } from "../../features/program/filters/ProgramFilters";
import { ProgramSearch } from "../../features/program/search/ProgramSearch";
import { SuggestProgramForm } from "../../features/submission/create/SuggestProgramForm";
import { toFormValues } from "../../features/submission/create/validation";
import { AdminTabs } from "../../widgets/admin-tabs/AdminTabs";
import { AppShell } from "../../widgets/app-shell/AppShell";
import { FilterSidebar } from "../../widgets/filter-sidebar/FilterSidebar";
import { Pagination } from "../../widgets/pagination/Pagination";
import { ProgramList } from "../../widgets/program-list/ProgramList";

const emptyPage: ProgramPage = {
  programs: [],
  page: 0,
  size: PROGRAMS_PAGE_SIZE,
  totalElements: 0,
  totalPages: 0
};

export function AdminProgramsPage() {
  const [result, setResult] = useState<ProgramPage>(emptyPage);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [type, setType] = useState<ProgramType | "">("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Program | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

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
        const nextResult = await listPrograms(
          activeFilters,
          { page, size: PROGRAMS_PAGE_SIZE },
          abortController.signal
        );

        if (!isActive) {
          return;
        }

        if (nextResult.totalPages > 0 && page >= nextResult.totalPages) {
          setPage(nextResult.totalPages - 1);
          return;
        }

        setResult(nextResult);
      } catch (loadError) {
        if (abortController.signal.aborted || !isActive) {
          return;
        }

        setResult(emptyPage);
        setError(toFriendlyApiError(loadError, "We couldn’t load the catalog right now."));
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
  }, [activeFilters, page, reloadToken]);

  const reload = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  const changeFilter = useCallback(<T,>(setter: (value: T) => void) => {
    return (value: T) => {
      setter(value);
      setPage(0);
    };
  }, []);

  const handleSaveEdit = useCallback(
    async (draft: ProgramDraft) => {
      if (!editing) {
        return;
      }

      await updateProgram(editing.id, draft);
      setNotice(`“${draft.title}” updated.`);
      setEditing(null);
      reload();
    },
    [editing, reload]
  );

  const handleDeleted = useCallback(
    (program: Program) => {
      setNotice(`“${program.title}” deleted.`);
      // Перечитываем, а не вырезаем из списка: страница должна дозаполниться
      // элементом со следующей.
      reload();
    },
    [reload]
  );

  return (
    <AppShell
      title="Admin / all programs"
      description="Published catalog. Edit or remove programs that are already live."
      navigation={<AdminTabs currentRoute="adminPrograms" />}
      aside={
        <FilterSidebar>
          <ProgramSearch onChange={changeFilter(setQuery)} value={query} />
          <ProgramFilters
            country={country}
            onCountryChange={changeFilter(setCountry)}
            onReset={() => {
              setQuery("");
              setCountry("");
              setType("");
              setPage(0);
            }}
            onTypeChange={changeFilter(setType)}
            type={type}
          />
        </FilterSidebar>
      }
    >
      <section className="programs-page__header">
        <div>
          <h2>Published programs</h2>
          <p>
            {error
              ? "The catalog is temporarily unavailable."
              : isLoading
              ? "Loading the catalog..."
              : `${result.totalElements} ${result.totalElements === 1 ? "program" : "programs"}`}
          </p>
        </div>
      </section>

      <div aria-live="polite">
        {notice ? <p className="form-feedback__success review-page__decision">{notice}</p> : null}
      </div>

      {editing ? (
        <section className="page-section">
          <SuggestProgramForm
            heading={`Editing “${editing.title}”`}
            initialValues={toFormValues(editing)}
            onCancel={() => setEditing(null)}
            onSubmit={handleSaveEdit}
            resetAfterSubmit={false}
            submitLabel="Save changes"
            successMessage="Program updated."
          />
        </section>
      ) : null}

      {error ? (
        <div className="error-banner">
          <p>{error}</p>
          <button className="secondary-button" onClick={reload} type="button">
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="placeholder-card">Loading the catalog...</div>
      ) : (
        <>
          <ProgramList
            emptyMessage="No programs match these filters."
            programs={result.programs}
            renderActions={(program) => (
              <ProgramAdminActions
                onDeleted={handleDeleted}
                onEdit={(next) => {
                  setEditing(next);
                  setNotice("");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                program={program}
              />
            )}
            showFavoriteToggle={false}
          />
          <Pagination
            currentPage={result.page}
            disabled={isLoading}
            onPageChange={(nextPage) => {
              setPage(nextPage);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            totalPages={result.totalPages}
          />
        </>
      )}
    </AppShell>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../../shared/api/http";
import type { ProgramType } from "../../shared/types/program";
import { useDebouncedValue } from "../../shared/lib/useDebouncedValue";
import { listPrograms, PROGRAMS_PAGE_SIZE, type ProgramPage } from "../../entities/program/api";
import { GuestNotice } from "../../features/auth/guest-notice/GuestNotice";
import { ProgramFilters } from "../../features/program/filters/ProgramFilters";
import { ProgramSearch } from "../../features/program/search/ProgramSearch";
import { AppShell } from "../../widgets/app-shell/AppShell";
import { FilterSidebar } from "../../widgets/filter-sidebar/FilterSidebar";
import { Pagination } from "../../widgets/pagination/Pagination";
import { ProgramList } from "../../widgets/program-list/ProgramList";
import { MobileBottomNav } from "../../widgets/mobile-bottom-nav/MobileBottomNav";
import { useFavorites } from "../../app/providers/FavoritesProvider";

const emptyPage: ProgramPage = {
  programs: [],
  page: 0,
  size: PROGRAMS_PAGE_SIZE,
  totalElements: 0,
  totalPages: 0
};

/** Ключ перевода для ошибки загрузки каталога. */
function toProgramsErrorKey(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status >= 500) {
      return "programs.loadErrorServer";
    }

    if (error.status === 400) {
      return "programs.loadErrorFilters";
    }
  }

  if (error instanceof TypeError) {
    return "programs.loadErrorNetwork";
  }

  return "programs.loadError";
}

export function ProgramsPage() {
  const { t } = useTranslation();
  const { actionError: favoriteError } = useFavorites();
  const [result, setResult] = useState<ProgramPage>(emptyPage);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [type, setType] = useState<ProgramType | "">("");
  const [page, setPage] = useState(0);
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
        const nextResult = await listPrograms(
          activeFilters,
          { page, size: PROGRAMS_PAGE_SIZE },
          abortController.signal
        );

        if (!isActive) {
          return;
        }

        // Страница уехала за границу выборки — например, программу удалили,
        // пока мы стояли на последней. Сдвигаемся на существующую.
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
        setError(t(toProgramsErrorKey(loadError) as never));
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
  }, [activeFilters, page, requestVersion, t]);

  // Смена фильтра почти всегда меняет и число страниц, поэтому возвращаемся
  // на первую. Сбрасываем в обработчике, а не эффектом, — иначе после дебаунса
  // ушло бы два запроса подряд.
  const changeFilter = useCallback(<T,>(setter: (value: T) => void) => {
    return (value: T) => {
      setter(value);
      setPage(0);
    };
  }, []);

  function resetFilters() {
    setQuery("");
    setCountry("");
    setType("");
    setPage(0);
  }

  function goToPage(nextPage: number) {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function describeResults() {
    if (error) {
      return t("programs.unavailable");
    }

    if (isLoading) {
      return t("common.loading");
    }

    if (result.totalElements === 0) {
      return t("programs.nothingFound");
    }

    if (result.totalPages <= 1) {
      return t("programs.programsFound", { count: result.totalElements });
    }

    const from = result.page * result.size + 1;

    return t("programs.rangeOfTotal", {
      from,
      to: from + result.programs.length - 1,
      total: result.totalElements
    });
  }

  return (
    <AppShell
      title={t("programs.catalogTitle")}
      description={t("programs.catalogDescription")}
      aside={
        <FilterSidebar>
          <ProgramSearch onChange={changeFilter(setQuery)} value={query} />
          <ProgramFilters
            country={country}
            onCountryChange={changeFilter(setCountry)}
            onReset={resetFilters}
            onTypeChange={changeFilter(setType)}
            type={type}
          />
        </FilterSidebar>
      }
      navigation={<MobileBottomNav currentRoute="programs" />}
    >
      <section className="programs-page__header">
        <div>
          <h2>{t("programs.catalogHeading")}</h2>
          <p>{describeResults()}</p>
        </div>
      </section>

      <GuestNotice />

      {error ? (
        <div className="error-banner">
          <p>{error}</p>
          <button
            className="secondary-button"
            onClick={() => setRequestVersion((current) => current + 1)}
            type="button"
          >
            {t("common.retry")}
          </button>
        </div>
      ) : null}

      {favoriteError ? <div className="error-banner"><p>{favoriteError}</p></div> : null}

      {isLoading ? (
        <div className="placeholder-card">{t("common.loading")}</div>
      ) : error ? null : (
        <>
          <ProgramList
            emptyMessage={t("programs.emptyFiltered")}
            programs={result.programs}
          />
          <Pagination
            currentPage={result.page}
            disabled={isLoading}
            onPageChange={goToPage}
            totalPages={result.totalPages}
          />
        </>
      )}
    </AppShell>
  );
}

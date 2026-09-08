import { useEffect, useState } from "react";
import {
  deleteProgram,
  listAdminPrograms,
  PROGRAMS_PAGE_SIZE,
  type ProgramPage
} from "../../entities/program/api";
import { toFriendlyApiError } from "../../shared/api/problem";
import { AdminTabs } from "../../widgets/admin-tabs/AdminTabs";
import { AppShell } from "../../widgets/app-shell/AppShell";
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
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError("");

    listAdminPrograms({ page, size: PROGRAMS_PAGE_SIZE }, controller.signal)
      .then((nextResult) => {
        if (nextResult.totalPages > 0 && page >= nextResult.totalPages) {
          setPage(nextResult.totalPages - 1);
          return;
        }
        setResult(nextResult);
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) {
          setError(toFriendlyApiError(loadError, "We couldn’t load the program catalog."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [page, reloadToken]);

  async function handleDelete(programId: number, title: string) {
    if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) {
      return;
    }

    setPendingId(programId);
    setError("");
    try {
      await deleteProgram(programId);
      setReloadToken((value) => value + 1);
    } catch (deleteError) {
      setError(toFriendlyApiError(deleteError, "We couldn’t delete this program."));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <AppShell
      title="Admin / all programs"
      description="Browse published and non-public programs or remove outdated entries."
      navigation={<AdminTabs currentRoute="adminPrograms" />}
    >
      <section className="programs-page__header">
        <div>
          <h2>Program catalog</h2>
          <p>{isLoading ? "Loading programs..." : `${result.totalElements} programs`}</p>
        </div>
      </section>

      {error ? (
        <div className="error-banner">
          <p>{error}</p>
          <button className="secondary-button" onClick={() => setReloadToken((value) => value + 1)} type="button">
            Retry
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="placeholder-card">Loading programs...</div>
      ) : (
        <>
          <ProgramList
            linkTitles={false}
            programs={result.programs}
            showFavoriteToggle={false}
            renderActions={(program) => (
              <button
                className="secondary-button secondary-button--danger"
                disabled={pendingId !== null}
                onClick={() => void handleDelete(program.id, program.title)}
                type="button"
              >
                {pendingId === program.id ? "Deleting..." : "Delete"}
              </button>
            )}
          />
          <Pagination
            currentPage={result.page}
            disabled={isLoading || pendingId !== null}
            onPageChange={setPage}
            totalPages={result.totalPages}
          />
        </>
      )}
    </AppShell>
  );
}

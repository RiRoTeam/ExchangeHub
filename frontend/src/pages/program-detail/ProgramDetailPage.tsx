import { useEffect, useState } from "react";
import { getProgramById } from "../../entities/program/api";
import { ApiError } from "../../shared/api/http";
import { toFriendlyApiError } from "../../shared/api/problem";
import type { Program } from "../../shared/types/program";
import { useRouter } from "../../app/router/RouterProvider";
import { AppShell } from "../../widgets/app-shell/AppShell";
import { MobileBottomNav } from "../../widgets/mobile-bottom-nav/MobileBottomNav";

type ProgramDetailPageProps = {
  /** Сырой сегмент пути — валидируем здесь, роутер типы не знает. */
  programId: string;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "loaded"; program: Program }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

function formatDate(value: string | null) {
  if (!value) {
    return "Not specified";
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

function formatProgramType(type: Program["type"]) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function parseProgramId(rawId: string) {
  // Бэк ждёт Long: дробное, отрицательное и "abc" до сети пускать незачем.
  if (!/^\d+$/.test(rawId)) {
    return null;
  }

  const parsed = Number(rawId);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function ProgramDetailPage({ programId }: ProgramDetailPageProps) {
  const { navigate } = useRouter();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  const parsedId = parseProgramId(programId);

  useEffect(() => {
    if (parsedId === null) {
      setState({ kind: "not-found" });
      return;
    }

    const abortController = new AbortController();
    let isActive = true;

    async function loadProgram(id: number) {
      setState({ kind: "loading" });

      try {
        const program = await getProgramById(id, abortController.signal);

        if (isActive) {
          setState({ kind: "loaded", program });
        }
      } catch (error) {
        if (abortController.signal.aborted || !isActive) {
          return;
        }

        if (error instanceof ApiError && error.status === 404) {
          setState({ kind: "not-found" });
          return;
        }

        setState({
          kind: "error",
          message: toFriendlyApiError(error, "We couldn’t load this program right now.")
        });
      }
    }

    void loadProgram(parsedId);

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [parsedId, reloadToken]);

  const program = state.kind === "loaded" ? state.program : null;

  return (
    <AppShell
      title={program ? program.title : "Program"}
      description={
        program
          ? `${formatProgramType(program.type)} · ${program.country}`
          : "Program details."
      }
      navigation={<MobileBottomNav currentRoute="programs" />}
    >
      <div className="detail-actions">
        <button
          className="secondary-button"
          onClick={() => navigate("/programs")}
          type="button"
        >
          ← Back to catalog
        </button>
      </div>

      {state.kind === "loading" ? <div className="placeholder-card">Loading program...</div> : null}

      {state.kind === "not-found" ? (
        <div className="placeholder-card">
          <h2>Program not found</h2>
          <p>
            This program doesn’t exist, or it was removed from the catalog. Try browsing the
            catalog instead.
          </p>
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div className="error-banner">
          <p>{state.message}</p>
          <button
            className="secondary-button"
            onClick={() => setReloadToken((current) => current + 1)}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : null}

      {program ? (
        <article className="program-detail">
          <header className="program-detail__header">
            <h2>{program.title}</h2>
            <span className={`status-pill status-pill--${program.status.toLowerCase()}`}>
              {program.status.charAt(0) + program.status.slice(1).toLowerCase()}
            </span>
          </header>

          <dl className="program-detail__facts">
            <div className="profile-list__row">
              <dt>Country</dt>
              <dd>{program.country}</dd>
            </div>
            <div className="profile-list__row">
              <dt>Type</dt>
              <dd>{formatProgramType(program.type)}</dd>
            </div>
            <div className="profile-list__row">
              <dt>Deadline</dt>
              <dd>{program.deadline ? formatDate(program.deadline) : "Open or not specified"}</dd>
            </div>
            <div className="profile-list__row">
              <dt>Added</dt>
              <dd>{formatDate(program.createdAt)}</dd>
            </div>
          </dl>

          <section className="program-detail__description">
            <h3>About the program</h3>
            <p>{program.description}</p>
          </section>

          {program.url ? (
            <a
              className="primary-button program-detail__link"
              href={program.url}
              rel="noreferrer"
              target="_blank"
            >
              Open the official page
            </a>
          ) : (
            <p className="form-field__hint">No official link was provided for this program.</p>
          )}
        </article>
      ) : null}
    </AppShell>
  );
}

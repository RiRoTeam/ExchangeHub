import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getProgramById, recordProgramEvent } from "../../entities/program/api";
import { ProgramBadges } from "../../entities/program/ProgramBadges";
import { ToggleFavoriteButton } from "../../features/favorites/toggle-favorite/ToggleFavoriteButton";
import { getDeadlineState } from "../../entities/program/lib";
import { useFormatters } from "../../shared/i18n/useFormatters";
import { ApiError } from "../../shared/api/http";
import { useApiErrorText } from "../../shared/i18n/useApiErrorText";
import { safeExternalUrl } from "../../shared/lib/safeUrl";
import type { Program } from "../../shared/types/program";
import { useRouter } from "../../app/router/RouterProvider";
import { GuestNotice } from "../../features/auth/guest-notice/GuestNotice";
import { AppShell } from "../../widgets/app-shell/AppShell";
import { MobileBottomNav } from "../../widgets/mobile-bottom-nav/MobileBottomNav";
import { AdminTabs } from "../../widgets/admin-tabs/AdminTabs";
import { useAuth } from "../../app/providers/AuthProvider";
import { useFavorites } from "../../app/providers/FavoritesProvider";

type ProgramDetailPageProps = {
  /** Сырой сегмент пути — валидируем здесь, роутер типы не знает. */
  programId: string;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "loaded"; program: Program }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

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
  const { t } = useTranslation();
  const toErrorText = useApiErrorText();
  const { formatDate } = useFormatters();
  const { session } = useAuth();
  const { actionError: favoriteError } = useFavorites();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const recordedViews = useRef(new Set<number>());

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
          if (program.status === "ACTIVE" && !recordedViews.current.has(id)) {
            recordedViews.current.add(id);
            void recordProgramEvent(id, "VIEW").catch(() => {
              // Analytics must not turn a readable program into an error state.
            });
          }
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
          message: toErrorText(error, t("programs.detailLoadError"))
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
  const externalUrl = safeExternalUrl(program?.url);

  return (
    <AppShell
      title={program ? program.title : t("nav.allPrograms")}
      description={
        program
          ? `${t(`programType.${program.type}`)} · ${program.country}`
          : t("programs.aboutProgram")
      }
      navigation={
        session?.user.role === "ADMIN" ? (
          <AdminTabs currentRoute="adminPrograms" />
        ) : (
          <MobileBottomNav currentRoute="programs" />
        )
      }
    >
      <div className="detail-actions">
        <button
          className="secondary-button"
          onClick={() => navigate(session?.user.role === "ADMIN" ? "/admin/programs" : "/programs")}
          type="button"
        >
          {t("programs.backToCatalog")}
        </button>
      </div>

      <GuestNotice />

      {state.kind === "loading" ? <div className="placeholder-card">{t("common.loading")}</div> : null}

      {state.kind === "not-found" ? (
        <div className="placeholder-card">
          <h2>{t("programs.notFoundTitle")}</h2>
          <p>{t("programs.notFoundMessage")}</p>
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
            {t("common.retry")}
          </button>
        </div>
      ) : null}

      {favoriteError ? <div className="error-banner"><p>{favoriteError}</p></div> : null}

      {program ? (
        <article className="program-detail">
          <header className="program-detail__header">
            <h2>{program.title}</h2>
            <div className="program-badges">
              {session?.user.role === "USER" ? (
                <ToggleFavoriteButton program={program} size="large" />
              ) : null}
              <ProgramBadges program={program} />
              {/* ACTIVE не показываем: каталог отдаёт только активные программы,
                  так что плашка была бы на каждой карточке и ничего не значила.
                  А вот INACTIVE и DRAFT сообщают, что программа снята с публикации. */}
              {program.status === "ACTIVE" ? null : (
                <span className={`status-pill status-pill--${program.status.toLowerCase()}`}>
                  {t(`programStatus.${program.status}`)}
                </span>
              )}
            </div>
          </header>

          <dl className="program-detail__facts">
            <div className="profile-list__row">
              <dt>{t("programs.country")}</dt>
              <dd>{program.country}</dd>
            </div>
            <div className="profile-list__row">
              <dt>{t("programs.type")}</dt>
              <dd>{t(`programType.${program.type}`)}</dd>
            </div>
            <div className="profile-list__row">
              <dt>{t("programs.deadline")}</dt>
              <dd
                className={
                  getDeadlineState(program.deadline).kind === "passed"
                    ? "program-detail__deadline--passed"
                    : undefined
                }
              >
                {formatDate(program.deadline, t("programs.deadlineOpen"))}
              </dd>
            </div>
            <div className="profile-list__row">
              <dt>{t("programs.added")}</dt>
              <dd>{formatDate(program.createdAt, t("common.notSpecified"))}</dd>
            </div>
          </dl>

          <section className="program-detail__description">
            <h3>{t("programs.aboutProgram")}</h3>
            <p>{program.description}</p>
          </section>

          {externalUrl ? (
            <a
              className="primary-button program-detail__link"
              href={externalUrl}
              onClick={() => {
                if (program.status === "ACTIVE") {
                  void recordProgramEvent(program.id, "CLICK").catch(() => {
                    // Opening the official page is more important than analytics.
                  });
                }
              }}
              rel="noreferrer"
              target="_blank"
            >
              {t("programs.openOfficial")}
            </a>
          ) : (
            <p className="form-field__hint">{t("programs.noOfficialLink")}</p>
          )}
        </article>
      ) : null}
    </AppShell>
  );
}

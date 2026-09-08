import { useTranslation } from "react-i18next";
import { recordProgramEvent } from "../../entities/program/api";
import { AppLink } from "../../app/router/AppLink";
import { programDetailPath } from "../../app/router/routes";
import { ProgramBadges } from "../../entities/program/ProgramBadges";
import { ToggleFavoriteButton } from "../../features/favorites/toggle-favorite/ToggleFavoriteButton";
import { getDeadlineState } from "../../entities/program/lib";
import { useFormatters } from "../../shared/i18n/useFormatters";
import { safeExternalUrl } from "../../shared/lib/safeUrl";
import type { Program } from "../../shared/types/program";

type ProgramListProps = {
  programs: Program[];
  emptyMessage?: string;
  /** В админском каталоге избранное не нужно — там другие задачи. */
  showFavoriteToggle?: boolean;
  renderActions?: (program: Program) => React.ReactNode;
};

export function ProgramList({
  programs,
  emptyMessage,
  showFavoriteToggle = true,
  renderActions
}: ProgramListProps) {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();

  if (!programs.length) {
    return <div className="placeholder-card">{emptyMessage ?? t("programs.emptyFiltered")}</div>;
  }

  return (
    <section aria-label={t("programs.catalogHeading")} className="program-list">
      {programs.map((program) => {
        const isDeadlinePassed = getDeadlineState(program.deadline).kind === "passed";
        const externalUrl = safeExternalUrl(program.url);
        // GET /api/programs/{id} ищет программу через findByIdAndStatus(id, ACTIVE),
        // поэтому ссылка на черновик или снятую программу привела бы в 404.
        const isLinkable = program.status === "ACTIVE";

        return (
          <article
            className={`program-list__card ${isDeadlinePassed ? "program-list__card--muted" : ""}`}
            key={program.id}
          >
            <div className="program-list__heading">
              <h2>
                {isLinkable ? (
                  <AppLink className="program-list__title" to={programDetailPath(program.id)}>
                    {program.title}
                  </AppLink>
                ) : (
                  program.title
                )}
              </h2>
              <div className="program-list__actions">
                <ProgramBadges program={program} />
                {program.status === "ACTIVE" ? null : (
                  <span className={`status-pill status-pill--${program.status.toLowerCase()}`}>
                    {program.status.charAt(0) + program.status.slice(1).toLowerCase()}
                  </span>
                )}
                {showFavoriteToggle ? <ToggleFavoriteButton program={program} /> : null}
              </div>
            </div>

            <div className="program-list__meta">
              <p>
                <strong>{t("programs.country")}:</strong> {program.country}
              </p>
              <p>
                <strong>{t("programs.type")}:</strong> {t(`programType.${program.type}`)}
              </p>
              <p>
                <strong>{t("programs.deadline")}:</strong>{" "}
                {formatDate(program.deadline, t("programs.deadlineOpen"))}
              </p>
            </div>

            <p>{program.description}</p>

            {externalUrl ? (
              <a
                className="secondary-button program-list__link"
                href={externalUrl}
                onClick={() => {
                  if (program.status === "ACTIVE") {
                    void recordProgramEvent(program.id, "CLICK").catch(() => {
                      // Переход по ссылке важнее, чем запись события.
                    });
                  }
                }}
                rel="noreferrer"
                target="_blank"
              >
                {t("programs.openSource")}
              </a>
            ) : null}
            {renderActions ? <div className="action-strip">{renderActions(program)}</div> : null}
          </article>
        );
      })}
    </section>
  );
}

import { recordProgramEvent } from "../../entities/program/api";
import { AppLink } from "../../app/router/AppLink";
import { programDetailPath } from "../../app/router/routes";
import { ProgramBadges } from "../../entities/program/ProgramBadges";
import { ToggleFavoriteButton } from "../../features/favorites/toggle-favorite/ToggleFavoriteButton";
import { formatProgramDate, getDeadlineState } from "../../entities/program/lib";
import { safeExternalUrl } from "../../shared/lib/safeUrl";
import type { Program } from "../../shared/types/program";

type ProgramListProps = {
  programs: Program[];
  emptyMessage?: string;
  /** В админском каталоге избранное не нужно — там другие задачи. */
  showFavoriteToggle?: boolean;
  renderActions?: (program: Program) => React.ReactNode;
};

function formatProgramType(type: Program["type"]) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ProgramList({
  programs,
  emptyMessage = "Programs will appear here once the API is connected.",
  showFavoriteToggle = true,
  renderActions
}: ProgramListProps) {
  if (!programs.length) {
    return <div className="placeholder-card">{emptyMessage}</div>;
  }

  return (
    <section aria-label="Programs" className="program-list">
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
                <strong>Country:</strong> {program.country}
              </p>
              <p>
                <strong>Type:</strong> {formatProgramType(program.type)}
              </p>
              <p>
                <strong>Deadline:</strong>{" "}
                {formatProgramDate(program.deadline, "Open or not specified")}
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
                Open source
              </a>
            ) : null}
            {renderActions ? <div className="action-strip">{renderActions(program)}</div> : null}
          </article>
        );
      })}
    </section>
  );
}

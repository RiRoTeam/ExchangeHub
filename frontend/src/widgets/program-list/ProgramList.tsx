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
  showFavoriteToggle = true
}: ProgramListProps) {
  if (!programs.length) {
    return <div className="placeholder-card">{emptyMessage}</div>;
  }

  return (
    <section aria-label="Programs" className="program-list">
      {programs.map((program) => {
        const isDeadlinePassed = getDeadlineState(program.deadline).kind === "passed";
        const externalUrl = safeExternalUrl(program.url);

        return (
          <article
            className={`program-list__card ${isDeadlinePassed ? "program-list__card--muted" : ""}`}
            key={program.id}
          >
            <div className="program-list__heading">
              <h2>
                <AppLink className="program-list__title" to={programDetailPath(program.id)}>
                  {program.title}
                </AppLink>
              </h2>
              <div className="program-list__actions">
                <ProgramBadges program={program} />
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
                rel="noreferrer"
                target="_blank"
              >
                Open source
              </a>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}

import { AppLink } from "../../app/router/AppLink";
import { programDetailPath } from "../../app/router/routes";
import type { Program } from "../../shared/types/program";

type ProgramListProps = {
  programs: Program[];
  emptyMessage?: string;
};

function formatProgramType(type: Program["type"]) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDeadline(deadline: Program["deadline"]) {
  if (!deadline) {
    return "Open or not specified";
  }

  const parsedDate = new Date(deadline);

  if (Number.isNaN(parsedDate.getTime())) {
    return deadline;
  }

  return parsedDate.toLocaleDateString();
}

export function ProgramList({
  programs,
  emptyMessage = "Programs will appear here once the API is connected."
}: ProgramListProps) {
  if (!programs.length) {
    return <div className="placeholder-card">{emptyMessage}</div>;
  }

  return (
    <section aria-label="Programs" className="program-list">
      {programs.map((program) => (
        <article key={program.id} className="program-list__card">
          <h2>
            <AppLink className="program-list__title" to={programDetailPath(program.id)}>
              {program.title}
            </AppLink>
          </h2>
          <div className="program-list__meta">
            <p>
              <strong>Country:</strong> {program.country}
            </p>
            <p>
              <strong>Type:</strong> {formatProgramType(program.type)}
            </p>
            <p>
              <strong>Deadline:</strong> {formatDeadline(program.deadline)}
            </p>
          </div>
          <p>{program.description}</p>
          {program.url ? (
            <a className="secondary-button program-list__link" href={program.url} rel="noreferrer" target="_blank">
              Open source
            </a>
          ) : null}
        </article>
      ))}
    </section>
  );
}

import type { Program } from "../../shared/types/program";

type ProgramListProps = {
  programs: Program[];
  emptyMessage?: string;
};

export function ProgramList({
  programs,
  emptyMessage = "Programs will appear here once the API is connected."
}: ProgramListProps) {
  if (!programs.length) {
    return <p>{emptyMessage}</p>;
  }

  return (
    <section aria-label="Programs">
      {programs.map((program) => (
        <article key={program.id}>
          <h2>{program.title}</h2>
          <p>{program.description}</p>
          <p>
            {program.country} / {program.type}
          </p>
        </article>
      ))}
    </section>
  );
}

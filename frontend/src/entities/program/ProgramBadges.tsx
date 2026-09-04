import type { Program } from "../../shared/types/program";
import { formatDeadlineBadge, getDeadlineState, isRecentlyAdded } from "./lib";

type ProgramBadgesProps = {
  program: Pick<Program, "createdAt" | "deadline">;
  /** Подменяется в тестах, чтобы не зависеть от системных часов. */
  now?: Date;
};

/**
 * Плашки «новое» и срочности дедлайна.
 * Ничего не рендерит, когда сказать нечего — карточка не шумит.
 */
export function ProgramBadges({ program, now = new Date() }: ProgramBadgesProps) {
  const isNew = isRecentlyAdded(program.createdAt, now);
  const deadlineState = getDeadlineState(program.deadline, now);
  const deadlineLabel = formatDeadlineBadge(deadlineState);

  if (!isNew && !deadlineLabel) {
    return null;
  }

  return (
    <div className="program-badges">
      {isNew ? <span className="status-pill status-pill--new">New</span> : null}
      {deadlineLabel ? (
        <span className={`status-pill status-pill--deadline-${deadlineState.kind}`}>
          {deadlineLabel}
        </span>
      ) : null}
    </div>
  );
}

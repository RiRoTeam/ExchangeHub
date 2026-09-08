import { useTranslation } from "react-i18next";
import type { Program } from "../../shared/types/program";
import { getDeadlineState, isRecentlyAdded } from "./lib";

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
  const { t } = useTranslation();
  const isNew = isRecentlyAdded(program.createdAt, now);
  const deadlineState = getDeadlineState(program.deadline, now);

  // Подпись собирается здесь, а не в lib: множественное число зависит от языка,
  // а в русском у «дня» три формы.
  const deadlineLabel =
    deadlineState.kind === "passed"
      ? t("programs.deadlinePassed")
      : deadlineState.kind === "today"
      ? t("programs.deadlineToday")
      : deadlineState.kind === "urgent" || deadlineState.kind === "soon"
      ? t("programs.daysLeft", { count: deadlineState.daysLeft })
      : null;

  if (!isNew && !deadlineLabel) {
    return null;
  }

  return (
    <div className="program-badges">
      {isNew ? <span className="status-pill status-pill--new">{t("programs.badgeNew")}</span> : null}
      {deadlineLabel ? (
        <span className={`status-pill status-pill--deadline-${deadlineState.kind}`}>
          {deadlineLabel}
        </span>
      ) : null}
    </div>
  );
}

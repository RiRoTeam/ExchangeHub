import { useTranslation } from "react-i18next";
import { useFormatters } from "../../shared/i18n/useFormatters";
import { safeExternalUrl } from "../../shared/lib/safeUrl";
import type { Submission, SubmissionStatus } from "../../shared/types/submission";

type SubmissionListProps = {
  submissions: Submission[];
  emptyMessage?: string;
  /** Показывать автора заявки — нужно в админской очереди модерации. */
  showAuthor?: boolean;
  renderActions?: (submission: Submission) => React.ReactNode;
};

const statusKeys: Record<SubmissionStatus, string> = {
  PENDING: "submissions.statusPending",
  APPROVED: "submissions.statusApproved",
  REJECTED: "submissions.statusRejected"
};

export function SubmissionList({
  submissions,
  emptyMessage,
  showAuthor = false,
  renderActions
}: SubmissionListProps) {
  const { t } = useTranslation();
  const { formatDate } = useFormatters();

  if (!submissions.length) {
    return <div className="placeholder-card">{emptyMessage ?? t("submissions.empty")}</div>;
  }

  return (
    <section aria-label={t("submissions.listLabel")} className="program-list">
      {submissions.map((submission) => {
        const externalUrl = safeExternalUrl(submission.url);

        return (
        <article className="program-list__card" key={submission.id}>
          <div className="submission-card__header">
            <h3>{submission.title}</h3>
            <span
              className={`status-pill status-pill--${submission.status.toLowerCase()}`}
            >
              {t(statusKeys[submission.status] as never)}
            </span>
          </div>

          <div className="program-list__meta">
            {showAuthor ? (
              <p>
                <strong>{t("submissions.from")}:</strong> {submission.userName}
              </p>
            ) : null}
            <p>
              <strong>{t("programs.country")}:</strong> {submission.country}
            </p>
            <p>
              <strong>{t("programs.deadline")}:</strong>{" "}
              {formatDate(submission.deadline, t("common.notSpecified"))}
            </p>
            <p>
              <strong>{t("submissions.sent")}:</strong>{" "}
              {formatDate(submission.createdAt, t("common.notSpecified"))}
            </p>
          </div>

          <p>{submission.description}</p>

          {submission.adminComment ? (
            <p className="submission-card__comment">
              <strong>{t("submissions.moderator")}:</strong> {submission.adminComment}
            </p>
          ) : null}

          {externalUrl ? (
            <a
              className="secondary-button program-list__link"
              href={externalUrl}
              rel="noreferrer"
              target="_blank"
            >
              {t("programs.openSource")}
            </a>
          ) : null}

          {renderActions ? (
            <div className="submission-card__actions">{renderActions(submission)}</div>
          ) : null}
        </article>
        );
      })}
    </section>
  );
}

import type { Submission, SubmissionStatus } from "../../shared/types/submission";

type SubmissionListProps = {
  submissions: Submission[];
  emptyMessage?: string;
  /** Показывать автора заявки — нужно в админской очереди модерации. */
  showAuthor?: boolean;
  renderActions?: (submission: Submission) => React.ReactNode;
};

const statusLabels: Record<SubmissionStatus, string> = {
  PENDING: "On review",
  APPROVED: "Approved",
  REJECTED: "Rejected"
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not specified";
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

export function SubmissionList({
  submissions,
  emptyMessage = "No submissions yet.",
  showAuthor = false,
  renderActions
}: SubmissionListProps) {
  if (!submissions.length) {
    return <div className="placeholder-card">{emptyMessage}</div>;
  }

  return (
    <section aria-label="Submissions" className="program-list">
      {submissions.map((submission) => (
        <article className="program-list__card" key={submission.id}>
          <div className="submission-card__header">
            <h3>{submission.title}</h3>
            <span
              className={`status-pill status-pill--${submission.status.toLowerCase()}`}
            >
              {statusLabels[submission.status]}
            </span>
          </div>

          <div className="program-list__meta">
            {showAuthor ? (
              <p>
                <strong>From:</strong> {submission.userName}
              </p>
            ) : null}
            <p>
              <strong>Country:</strong> {submission.country}
            </p>
            <p>
              <strong>Deadline:</strong> {formatDate(submission.deadline)}
            </p>
            <p>
              <strong>Sent:</strong> {formatDate(submission.createdAt)}
            </p>
          </div>

          <p>{submission.description}</p>

          {submission.adminComment ? (
            <p className="submission-card__comment">
              <strong>Moderator:</strong> {submission.adminComment}
            </p>
          ) : null}

          {submission.url ? (
            <a
              className="secondary-button program-list__link"
              href={submission.url}
              rel="noreferrer"
              target="_blank"
            >
              Open source
            </a>
          ) : null}

          {renderActions ? <div className="action-strip">{renderActions(submission)}</div> : null}
        </article>
      ))}
    </section>
  );
}

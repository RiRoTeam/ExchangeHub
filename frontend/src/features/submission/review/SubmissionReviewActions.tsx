import { useState } from "react";
import { reviewSubmission } from "../../../entities/submission/api";
import { ApiError } from "../../../shared/api/http";
import { toFriendlyApiError } from "../../../shared/api/problem";
import type { Submission } from "../../../shared/types/submission";

type SubmissionReviewActionsProps = {
  submission: Submission;
  /** Заявка обработана — родитель убирает её из очереди. */
  onReviewed: (submission: Submission) => void;
  /** Кто-то уже решил её в другой вкладке: очередь надо перечитать. */
  onStale: () => void;
};

type Mode = "idle" | "rejecting";

export function SubmissionReviewActions({
  submission,
  onReviewed,
  onStale
}: SubmissionReviewActionsProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitDecision(status: "APPROVED" | "REJECTED") {
    setError("");
    setIsSubmitting(true);

    try {
      const reviewed = await reviewSubmission(submission.id, status, comment);
      onReviewed(reviewed);
    } catch (reviewError) {
      // 409 — заявку уже обработали, показывать её дальше нельзя.
      if (reviewError instanceof ApiError && reviewError.status === 409) {
        setError("This submission was already reviewed. Refreshing the queue.");
        onStale();
        return;
      }

      setError(toFriendlyApiError(reviewError, "We couldn’t save this decision."));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReject() {
    if (!comment.trim()) {
      setCommentError("Explain why you’re rejecting this — the author will see it.");
      return;
    }

    setCommentError("");
    void submitDecision("REJECTED");
  }

  const commentFieldId = `reject-comment-${submission.id}`;

  return (
    <div className="review-actions">
      {mode === "idle" ? (
        <div className="action-strip">
          <button
            className="primary-button"
            disabled={isSubmitting}
            onClick={() => void submitDecision("APPROVED")}
            type="button"
          >
            {isSubmitting ? "Publishing..." : "Approve and publish"}
          </button>
          <button
            className="secondary-button secondary-button--danger"
            disabled={isSubmitting}
            onClick={() => setMode("rejecting")}
            type="button"
          >
            Reject
          </button>
        </div>
      ) : (
        <div className="review-actions__reject">
          <div className="form-field">
            <label className="auth-form-fields__label" htmlFor={commentFieldId}>
              <span>Why are you rejecting this?</span>
              <textarea
                aria-invalid={Boolean(commentError)}
                className="text-input text-input--textarea review-actions__comment"
                disabled={isSubmitting}
                id={commentFieldId}
                onChange={(event) => {
                  setComment(event.target.value);
                  setCommentError("");
                }}
                placeholder="Duplicate of an existing program, broken link, not a real opportunity..."
                value={comment}
              />
            </label>
            {commentError ? (
              <p className="form-field__error" role="alert">
                {commentError}
              </p>
            ) : (
              <p className="form-field__hint">The author sees this on their submissions page.</p>
            )}
          </div>

          <div className="action-strip">
            <button
              className="secondary-button secondary-button--danger"
              disabled={isSubmitting}
              onClick={handleReject}
              type="button"
            >
              {isSubmitting ? "Rejecting..." : "Confirm rejection"}
            </button>
            <button
              className="secondary-button"
              disabled={isSubmitting}
              onClick={() => {
                setMode("idle");
                setComment("");
                setCommentError("");
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div aria-live="polite">
        {error ? <p className="form-field__error">{error}</p> : null}
      </div>
    </div>
  );
}

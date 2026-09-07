import { useState } from "react";
import { useTranslation } from "react-i18next";
import { reviewSubmission } from "../../../entities/submission/api";
import { ApiError } from "../../../shared/api/http";
import { useApiErrorText } from "../../../shared/i18n/useApiErrorText";
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
  const { t } = useTranslation();
  const toErrorText = useApiErrorText();
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
        setError(t("admin.alreadyReviewed"));
        onStale();
        return;
      }

      setError(toErrorText(reviewError, t("admin.reviewSaveError")));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReject() {
    if (!comment.trim()) {
      setCommentError(t("admin.rejectReasonRequired"));
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
            {isSubmitting ? t("admin.approving") : t("admin.approve")}
          </button>
          <button
            className="secondary-button secondary-button--danger"
            disabled={isSubmitting}
            onClick={() => setMode("rejecting")}
            type="button"
          >
            {t("admin.reject")}
          </button>
        </div>
      ) : (
        <div className="review-actions__reject">
          <div className="form-field">
            <label className="auth-form-fields__label" htmlFor={commentFieldId}>
              <span>{t("admin.rejectReasonLabel")}</span>
              <textarea
                aria-invalid={Boolean(commentError)}
                className="text-input text-input--textarea review-actions__comment"
                disabled={isSubmitting}
                id={commentFieldId}
                onChange={(event) => {
                  setComment(event.target.value);
                  setCommentError("");
                }}
                placeholder={t("admin.rejectReasonPlaceholder")}
                value={comment}
              />
            </label>
            {commentError ? (
              <p className="form-field__error" role="alert">
                {commentError}
              </p>
            ) : (
              <p className="form-field__hint">{t("admin.rejectReasonHint")}</p>
            )}
          </div>

          <div className="action-strip">
            <button
              className="secondary-button secondary-button--danger"
              disabled={isSubmitting}
              onClick={handleReject}
              type="button"
            >
              {isSubmitting ? t("admin.rejecting") : t("admin.confirmRejection")}
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
              {t("common.cancel")}
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

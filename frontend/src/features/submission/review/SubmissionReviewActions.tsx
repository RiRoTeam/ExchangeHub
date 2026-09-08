import { useState } from "react";
import { validateReviewComment, type ReviewDecision } from "./validation";

type SubmissionReviewActionsProps = {
  disabled?: boolean;
  onReview: (status: ReviewDecision, comment?: string) => Promise<void>;
};

export function SubmissionReviewActions({
  disabled = false,
  onReview
}: SubmissionReviewActionsProps) {
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");

  function submit(status: ReviewDecision) {
    const validationError = validateReviewComment(status, comment);

    if (validationError) {
      setCommentError(validationError);
      return;
    }

    setCommentError("");
    void onReview(status, comment);
  }

  return (
    <>
      <label className="form-field">
        <span>Moderator comment (required to decline)</span>
        <textarea
          aria-invalid={Boolean(commentError)}
          className="text-input"
          disabled={disabled}
          maxLength={2000}
          onChange={(event) => {
            setComment(event.target.value);
            setCommentError("");
          }}
          placeholder="Why was this accepted or declined?"
          rows={3}
          value={comment}
        />
        {commentError ? (
          <span className="form-field__error" role="alert">{commentError}</span>
        ) : null}
      </label>
      <button
        className="primary-button"
        disabled={disabled}
        onClick={() => submit("APPROVED")}
        type="button"
      >
        {disabled ? "Saving..." : "Publish"}
      </button>
      <button
        className="secondary-button secondary-button--danger"
        disabled={disabled}
        onClick={() => submit("REJECTED")}
        type="button"
      >
        Decline
      </button>
    </>
  );
}

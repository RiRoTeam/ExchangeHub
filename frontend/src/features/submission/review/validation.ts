export type ReviewDecision = "APPROVED" | "REJECTED";

export function validateReviewComment(status: ReviewDecision, comment: string) {
  if (status === "REJECTED" && !comment.trim()) {
    return "Add a moderator comment before declining this submission.";
  }

  return "";
}

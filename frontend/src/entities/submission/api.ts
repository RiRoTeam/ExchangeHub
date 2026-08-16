import { authorizedJsonBody, authorizedRequestJson } from "../../shared/api/http";
import type { ProgramDraft, Submission } from "../../shared/types/submission";

/** POST /api/submissions — отправить программу на модерацию. */
export function createSubmission(draft: ProgramDraft) {
  return authorizedJsonBody<Submission>("POST", "/submissions", draft);
}

/** GET /api/submissions/my — свои заявки со статусами. */
export function listMySubmissions(signal?: AbortSignal) {
  return authorizedRequestJson<Submission[]>("/submissions/my", { signal });
}

/** GET /api/admin/submissions — очередь модерации (только ADMIN). */
export function listPendingSubmissions(signal?: AbortSignal) {
  return authorizedRequestJson<Submission[]>("/admin/submissions", { signal });
}

/** PATCH /api/admin/submissions/{id} — одобрить или отклонить заявку. */
export function reviewSubmission(id: number, status: "APPROVED" | "REJECTED", comment?: string) {
  return authorizedJsonBody<Submission>("PATCH", `/admin/submissions/${id}`, {
    status,
    comment: comment?.trim() ? comment.trim() : null
  });
}

import type { ProgramType } from "./program";

export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";

export type Submission = {
  id: number;
  userId: number;
  userName: string;
  title: string;
  description: string;
  country: string;
  type: ProgramType;
  deadline: string | null;
  url: string | null;
  status: SubmissionStatus;
  adminComment: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

/**
 * Тело для POST /api/submissions и POST /api/admin/programs — на бэке это
 * SubmissionRequest и ProgramRequest, у них одинаковый набор полей.
 * deadline и url на бэке необязательны (@Future / @URL пропускают null).
 */
export type ProgramDraft = {
  title: string;
  description: string;
  country: string;
  type: ProgramType;
  deadline: string | null;
  url: string | null;
};

/** @deprecated Историческое имя, оставлено ради совместимости импортов. */
export type SuggestProgramRequest = ProgramDraft;

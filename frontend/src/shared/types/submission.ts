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

export type SuggestProgramRequest = {
  title: string;
  description: string;
  country: string;
  type: ProgramType;
  deadline: string;
  url: string;
};

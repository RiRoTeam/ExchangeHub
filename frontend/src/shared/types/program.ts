export type ProgramType = "INTERNSHIP" | "EXCHANGE" | "SCHOLARSHIP" | "OTHER";
/** Соответствует com.temka.app.entity.ProgramStatus на бэке. */
export type ProgramStatus = "ACTIVE" | "INACTIVE" | "DRAFT";

export type Program = {
  id: number;
  title: string;
  description: string;
  country: string;
  type: ProgramType;
  deadline: string | null;
  url: string | null;
  status: ProgramStatus;
  createdAt: string;
};

export type ProgramFilters = {
  type?: ProgramType;
  country?: string;
  query?: string;
};

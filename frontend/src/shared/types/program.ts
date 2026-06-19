export type ProgramType = "INTERNSHIP" | "EXCHANGE" | "SCHOLARSHIP" | "OTHER";
export type ProgramStatus = "ACTIVE" | "ARCHIVED";

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

export type ProgramEventType = "VIEW" | "CLICK";

export type TopProgramAnalytics = {
  id: number;
  title: string;
  views: number;
  clicks: number;
  favorites: number;
  totalEngagement: number;
};

export type DailyEngagement = {
  date: string;
  views: number;
  clicks: number;
  totalEngagement: number;
};

export type AdminAnalytics = {
  users: number;
  programs: number;
  submissions: number;
  favorites: number;
  views: number;
  clicks: number;
  topPrograms: TopProgramAnalytics[];
  dailyEngagement: DailyEngagement[];
};

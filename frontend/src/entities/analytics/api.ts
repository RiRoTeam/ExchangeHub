import { authorizedRequestJson } from "../../shared/api/http";

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

export function getAdminAnalytics(signal?: AbortSignal) {
  return authorizedRequestJson<AdminAnalytics>("/admin/analytics", { signal });
}

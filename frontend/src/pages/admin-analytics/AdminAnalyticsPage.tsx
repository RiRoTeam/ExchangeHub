import { useEffect, useState } from "react";
import { getAdminAnalytics, type AdminAnalytics } from "../../entities/analytics/api";
import { toFriendlyApiError } from "../../shared/api/problem";
import { AdminTabs } from "../../widgets/admin-tabs/AdminTabs";
import { AppShell } from "../../widgets/app-shell/AppShell";

const metricLabels: Array<[keyof Pick<AdminAnalytics, "users" | "programs" | "submissions" | "favorites" | "views" | "clicks">, string]> = [
  ["users", "Users"],
  ["programs", "Programs"],
  ["submissions", "Submissions"],
  ["favorites", "Favorites"],
  ["views", "Views"],
  ["clicks", "Outbound clicks"]
];

function formatAnalyticsDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError("");

    getAdminAnalytics(controller.signal)
      .then(setAnalytics)
      .catch((loadError) => {
        if (!controller.signal.aborted) {
          setError(toFriendlyApiError(loadError, "We couldn’t load analytics right now."));
        }
      });

    return () => controller.abort();
  }, [reloadToken]);

  return (
    <AppShell
      title="Admin / analytics"
      description="Platform totals and the programs receiving the most engagement."
      navigation={<AdminTabs currentRoute="adminAnalytics" />}
    >
      {error ? (
        <div className="error-banner">
          <p>{error}</p>
          <button className="secondary-button" onClick={() => setReloadToken((value) => value + 1)} type="button">
            Retry
          </button>
        </div>
      ) : !analytics ? (
        <div className="placeholder-card">Loading analytics...</div>
      ) : (
        <>
          <section className="profile-grid" aria-label="Analytics totals">
            {metricLabels.map(([field, label]) => (
              <div className="profile-card" key={field}>
                <h2>{label}</h2>
                <p>{analytics[field].toLocaleString()}</p>
              </div>
            ))}
          </section>

          <section className="page-section">
            <div className="programs-page__header">
              <div>
                <h2>Top programs</h2>
                <p>Views, clicks and saves combined.</p>
              </div>
            </div>
            {analytics.topPrograms.length ? (
              <div className="program-list">
                {analytics.topPrograms.map((program) => (
                  <article className="program-list__card" key={program.id}>
                    <h3>{program.title}</h3>
                    <p>
                      {program.views} views · {program.clicks} clicks · {program.favorites} saves
                    </p>
                    <strong>{program.totalEngagement} total engagements</strong>
                  </article>
                ))}
              </div>
            ) : (
              <div className="placeholder-card">No engagement has been recorded yet.</div>
            )}
          </section>

          <section className="page-section">
            <div className="programs-page__header">
              <div>
                <h2>Recent activity</h2>
                <p>Views and outbound clicks for the latest seven days.</p>
              </div>
            </div>
            {analytics.dailyEngagement.length ? (
              <div className="program-list">
                {analytics.dailyEngagement.slice(-7).map((day) => (
                  <article className="program-list__card" key={day.date}>
                    <h3>{formatAnalyticsDate(day.date)}</h3>
                    <p>{day.views} views · {day.clicks} clicks</p>
                    <strong>{day.totalEngagement} total engagements</strong>
                  </article>
                ))}
              </div>
            ) : (
              <div className="placeholder-card">No daily activity has been recorded yet.</div>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}

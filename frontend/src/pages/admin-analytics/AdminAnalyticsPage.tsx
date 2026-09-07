import { useEffect, useState } from "react";
import { getAdminAnalytics } from "../../entities/analytics/api";
import { toFriendlyApiError } from "../../shared/api/problem";
import type { AdminAnalytics } from "../../shared/types/analytics";
import { AdminTabs } from "../../widgets/admin-tabs/AdminTabs";
import { AppShell } from "../../widgets/app-shell/AppShell";
import { EngagementChart } from "../../widgets/engagement-chart/EngagementChart";

const TILES: Array<{ key: keyof AdminAnalytics; label: string }> = [
  { key: "users", label: "People" },
  { key: "programs", label: "Programs" },
  { key: "submissions", label: "Submissions" },
  { key: "favorites", label: "Saves" },
  { key: "views", label: "Program views" },
  { key: "clicks", label: "Link clicks" }
];

export function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();
    let isActive = true;

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        const next = await getAdminAnalytics(abortController.signal);

        if (isActive) {
          setAnalytics(next);
        }
      } catch (loadError) {
        if (abortController.signal.aborted || !isActive) {
          return;
        }

        setAnalytics(null);
        setError(toFriendlyApiError(loadError, "We couldn’t load analytics right now."));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [reloadToken]);

  const topPrograms = analytics?.topPrograms ?? [];
  // Ширина полосы — доля от лидера, а не от суммы: сравниваем между собой.
  const topMax = Math.max(1, ...topPrograms.map((program) => program.totalEngagement));

  return (
    <AppShell
      title="Admin / analytics"
      description="How people are finding and using the catalog."
      navigation={<AdminTabs currentRoute="adminAnalytics" />}
    >
      {error ? (
        <div className="error-banner">
          <p>{error}</p>
          <button
            className="secondary-button"
            onClick={() => setReloadToken((current) => current + 1)}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : isLoading || !analytics ? (
        <div className="placeholder-card">Loading analytics...</div>
      ) : (
        <>
          <section aria-label="Key numbers" className="kpi-row">
            {TILES.map((tile) => (
              <article className="kpi-tile" key={tile.key}>
                <p className="kpi-tile__label">{tile.label}</p>
                <p className="kpi-tile__value">{(analytics[tile.key] as number).toLocaleString()}</p>
              </article>
            ))}
          </section>

          <section className="page-section">
            <h2 className="analytics-section__title">Daily engagement</h2>
            <EngagementChart data={analytics.dailyEngagement} />
          </section>

          <section className="page-section">
            <h2 className="analytics-section__title">Most engaging programs</h2>

            {topPrograms.length === 0 ? (
              <div className="placeholder-card">
                No program has been opened yet, so there is nothing to rank.
              </div>
            ) : (
              <div className="chart__table-wrapper">
                <table className="chart__table top-programs">
                  <thead>
                    <tr>
                      <th scope="col">Program</th>
                      <th scope="col">Views</th>
                      <th scope="col">Clicks</th>
                      <th scope="col">Saves</th>
                      <th scope="col">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPrograms.map((program) => (
                      <tr key={program.id}>
                        <th scope="row">
                          <span className="top-programs__title">{program.title}</span>
                          <span
                            aria-hidden="true"
                            className="top-programs__bar"
                            style={{
                              width: `${Math.max((program.totalEngagement / topMax) * 100, 2)}%`
                            }}
                          />
                        </th>
                        <td>{program.views}</td>
                        <td>{program.clicks}</td>
                        <td>{program.favorites}</td>
                        <td className="top-programs__total">{program.totalEngagement}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}

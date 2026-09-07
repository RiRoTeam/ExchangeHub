import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAdminAnalytics } from "../../entities/analytics/api";
import { useApiErrorText } from "../../shared/i18n/useApiErrorText";
import type { AdminAnalytics } from "../../shared/types/analytics";
import { useFormatters } from "../../shared/i18n/useFormatters";
import { AdminTabs } from "../../widgets/admin-tabs/AdminTabs";
import { AppShell } from "../../widgets/app-shell/AppShell";
import { EngagementChart } from "../../widgets/engagement-chart/EngagementChart";

const TILES: Array<{ key: keyof AdminAnalytics; labelKey: string }> = [
  { key: "users", labelKey: "admin.tileUsers" },
  { key: "programs", labelKey: "admin.tilePrograms" },
  { key: "submissions", labelKey: "admin.tileSubmissions" },
  { key: "favorites", labelKey: "admin.tileFavorites" },
  { key: "views", labelKey: "admin.tileViews" },
  { key: "clicks", labelKey: "admin.tileClicks" }
];

export function AdminAnalyticsPage() {
  const { t } = useTranslation();
  const toErrorText = useApiErrorText();
  const { formatNumber } = useFormatters();
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
        setError(toErrorText(loadError, t("admin.analyticsLoadError")));
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
  }, [reloadToken, t, toErrorText]);

  const topPrograms = analytics?.topPrograms ?? [];
  // Ширина полосы — доля от лидера, а не от суммы: сравниваем между собой.
  const topMax = Math.max(1, ...topPrograms.map((program) => program.totalEngagement));

  return (
    <AppShell
      title={t("admin.analyticsTitle")}
      description={t("admin.analyticsDescription")}
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
            {t("common.retry")}
          </button>
        </div>
      ) : isLoading || !analytics ? (
        <div className="placeholder-card">{t("admin.analyticsLoading")}</div>
      ) : (
        <>
          <section aria-label={t("admin.keyNumbers")} className="kpi-row">
            {TILES.map((tile) => (
              <article className="kpi-tile" key={tile.key}>
                <p className="kpi-tile__label">{t(tile.labelKey as never)}</p>
                <p className="kpi-tile__value">{formatNumber(analytics[tile.key] as number)}</p>
              </article>
            ))}
          </section>

          <section className="page-section">
            <h2 className="analytics-section__title">{t("admin.dailyEngagement")}</h2>
            <EngagementChart data={analytics.dailyEngagement} />
          </section>

          <section className="page-section">
            <h2 className="analytics-section__title">{t("admin.topPrograms")}</h2>

            {topPrograms.length === 0 ? (
              <div className="placeholder-card">
                {t("admin.topProgramsEmpty")}
              </div>
            ) : (
              <div className="chart__table-wrapper">
                <table className="chart__table top-programs">
                  <thead>
                    <tr>
                      <th scope="col">{t("admin.columnProgram")}</th>
                      <th scope="col">{t("admin.columnViews")}</th>
                      <th scope="col">{t("admin.columnClicks")}</th>
                      <th scope="col">{t("admin.columnSaves")}</th>
                      <th scope="col">{t("admin.columnTotal")}</th>
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

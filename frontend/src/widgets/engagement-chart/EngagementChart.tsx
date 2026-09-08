import { useState } from "react";
import { useTranslation } from "react-i18next";
import { buildLinePath, buildScale, buildYTicks } from "../../shared/lib/chart";
import { useFormatters } from "../../shared/i18n/useFormatters";
import type { DailyEngagement } from "../../shared/types/analytics";

type EngagementChartProps = {
  data: DailyEngagement[];
};

const WIDTH = 720;
const HEIGHT = 240;
const PADDING = { top: 16, right: 56, bottom: 28, left: 44 };

const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

/** Слоты 1 и 2 валидированной категориальной палитры. */
const SERIES = [
  { key: "views" as const, labelKey: "admin.chartViews", color: "#2a78d6" },
  { key: "clicks" as const, labelKey: "admin.chartClicks", color: "#eb6834" }
];

export function EngagementChart({ data }: EngagementChartProps) {
  const { t } = useTranslation();
  const { formatDay } = useFormatters();
  const [asTable, setAsTable] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="placeholder-card">
        {t("admin.chartEmpty")}
      </div>
    );
  }

  const maxValue = Math.max(
    1,
    ...data.map((day) => Math.max(day.views, day.clicks))
  );
  const scale = buildScale(data.length, maxValue, PLOT_WIDTH, PLOT_HEIGHT);
  const ticks = buildYTicks(maxValue);
  const hoveredDay = hovered === null ? null : data[hovered];

  return (
    <div className="chart">
      <div className="chart__header">
        <div className="chart__legend">
          {SERIES.map((series) => (
            <span className="chart__legend-item" key={series.key}>
              <span
                aria-hidden="true"
                className="chart__swatch"
                style={{ background: series.color }}
              />
              {t(series.labelKey as never)}
            </span>
          ))}
        </div>
        <button
          className="secondary-button chart__toggle"
          onClick={() => setAsTable((current) => !current)}
          type="button"
        >
          {asTable ? t("admin.showChart") : t("admin.showTable")}
        </button>
      </div>

      {asTable ? (
        <div className="chart__table-wrapper">
          <table className="chart__table">
            <caption className="chart__caption">{t("admin.chartCaption")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("admin.columnDay")}</th>
                <th scope="col">{t("admin.columnViews")}</th>
                <th scope="col">{t("admin.columnClicks")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((day) => (
                <tr key={day.date}>
                  <th scope="row">{formatDay(day.date)}</th>
                  <td>{day.views}</td>
                  <td>{day.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <figure className="chart__figure">
          <svg
            aria-label={t("admin.chartAria")}
            className="chart__svg"
            role="img"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          >
            <g transform={`translate(${PADDING.left} ${PADDING.top})`}>
              {ticks.map((tick) => {
                const y = scale.toY(tick);

                return (
                  <g key={tick}>
                    <line
                      className="chart__grid"
                      x1={0}
                      x2={PLOT_WIDTH}
                      y1={y}
                      y2={y}
                    />
                    <text className="chart__tick" dy="0.32em" textAnchor="end" x={-10} y={y}>
                      {tick}
                    </text>
                  </g>
                );
              })}

              {data.map((day, index) =>
                index === 0 || index === data.length - 1 || index === hovered ? (
                  <text
                    className="chart__tick"
                    key={day.date}
                    textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"}
                    x={scale.toX(index)}
                    y={PLOT_HEIGHT + 20}
                  >
                    {formatDay(day.date)}
                  </text>
                ) : null
              )}

              {hoveredDay ? (
                <line
                  className="chart__crosshair"
                  x1={scale.toX(hovered as number)}
                  x2={scale.toX(hovered as number)}
                  y1={0}
                  y2={PLOT_HEIGHT}
                />
              ) : null}

              {SERIES.map((series) => (
                <path
                  d={buildLinePath(
                    data.map((day) => day[series.key]),
                    scale
                  )}
                  fill="none"
                  key={series.key}
                  stroke={series.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              ))}

              {SERIES.map((series) => {
                const lastIndex = data.length - 1;
                const value = data[lastIndex][series.key];

                return (
                  <g key={series.key}>
                    <circle
                      cx={scale.toX(lastIndex)}
                      cy={scale.toY(value)}
                      fill={series.color}
                      r={4}
                      stroke="var(--color-surface)"
                      strokeWidth={2}
                    />
                    <text
                      className="chart__end-label"
                      dy="0.32em"
                      x={scale.toX(lastIndex) + 10}
                      y={scale.toY(value)}
                    >
                      {value}
                    </text>
                  </g>
                );
              })}

              {data.map((day, index) => (
                <rect
                  fill="transparent"
                  height={PLOT_HEIGHT}
                  key={day.date}
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                  width={Math.max(PLOT_WIDTH / data.length, 12)}
                  x={scale.toX(index) - Math.max(PLOT_WIDTH / data.length, 12) / 2}
                  y={0}
                />
              ))}
            </g>
          </svg>

          <figcaption aria-live="polite" className="chart__tooltip">
            {hoveredDay
              ? t("admin.chartTooltip", {
                  day: formatDay(hoveredDay.date),
                  views: hoveredDay.views,
                  clicks: hoveredDay.clicks
                })
              : t("admin.chartHint")}
          </figcaption>
        </figure>
      )}
    </div>
  );
}

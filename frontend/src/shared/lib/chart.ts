/** Геометрия линейного графика. Чистые функции — рисование отдельно от расчёта. */

export type ChartPoint = { x: number; y: number };

/**
 * Округляет верх шкалы до «круглого» числа, чтобы подписи оси
 * читались как 0 / 50 / 100, а не как 0 / 47 / 94.
 */
export function niceCeiling(value: number) {
  if (value <= 0) {
    return 1;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;

  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return step * magnitude;
}

/** Подписи оси Y: от нуля до максимума, count интервалов. */
export function buildYTicks(maxValue: number, count = 4) {
  const ceiling = niceCeiling(maxValue);

  return Array.from({ length: count + 1 }, (_, index) =>
    Math.round((ceiling / count) * index)
  );
}

export type ChartScale = {
  toX: (index: number) => number;
  toY: (value: number) => number;
};

export function buildScale(
  pointCount: number,
  maxValue: number,
  width: number,
  height: number
): ChartScale {
  const ceiling = niceCeiling(maxValue);
  // Одна точка не образует отрезка — ставим её по центру.
  const step = pointCount > 1 ? width / (pointCount - 1) : 0;

  return {
    toX: (index) => (pointCount > 1 ? index * step : width / 2),
    toY: (value) => height - (ceiling > 0 ? (value / ceiling) * height : 0)
  };
}

/** Ломаная по точкам: "M x y L x y ...". */
export function buildLinePath(values: number[], scale: ChartScale) {
  if (values.length === 0) {
    return "";
  }

  return values
    .map((value, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${scale.toX(index).toFixed(2)} ${scale.toY(value).toFixed(2)}`;
    })
    .join(" ");
}

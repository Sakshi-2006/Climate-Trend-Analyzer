import type {
  AnomalyPoint,
  ClimateRecord,
  ClimateVariable,
  DatasetSummary,
  ForecastPoint,
  TrendResult,
} from "./types";

export const VARIABLE_LABELS: Record<ClimateVariable, string> = {
  temperature: "Temperature (°C)",
  rainfall: "Rainfall (mm)",
  humidity: "Humidity (%)",
  co2: "CO₂ (ppm)",
  sea_level: "Sea Level (mm)",
};

export const VARIABLE_SHORT: Record<ClimateVariable, string> = {
  temperature: "Temperature",
  rainfall: "Rainfall",
  humidity: "Humidity",
  co2: "CO₂",
  sea_level: "Sea Level",
};

export const VARIABLE_UNITS: Record<ClimateVariable, string> = {
  temperature: "°C",
  rainfall: "mm",
  humidity: "%",
  co2: "ppm",
  sea_level: "mm",
};

export const VARIABLE_COLORS: Record<ClimateVariable, string> = {
  temperature: "#ef4444",
  rainfall: "#3b82f6",
  humidity: "#06b6d4",
  co2: "#8b5cf2",
  sea_level: "#14b8a6",
};

export const ALL_VARIABLES: ClimateVariable[] = [
  "temperature",
  "rainfall",
  "humidity",
  "co2",
  "sea_level",
];

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function correlation(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  if (dx === 0 || dy === 0) return 0;
  return num / Math.sqrt(dx * dy);
}

/**
 * Ordinary least squares linear regression of y on x.
 * Returns slope, intercept, and r².
 */
export function linearRegression(
  xs: number[],
  ys: number[]
): { slope: number; intercept: number; rSquared: number } {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, rSquared: 0 };
  const mx = mean(xs);
  const my = mean(ys);
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0) return { slope: 0, intercept: my, rSquared: 0 };
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const rSquared = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept, rSquared };
}

/**
 * Rolling mean (centered=False, trailing window) over a series.
 */
export function rollingMean(values: number[], window: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) continue;
    let s = 0;
    for (let j = i - window + 1; j <= i; j++) s += values[j];
    out[i] = s / window;
  }
  return out;
}

/**
 * Trend analysis for a single variable using OLS regression on time index
 * (years as decimal). Aggregates across all regions by taking the monthly mean.
 */
export function analyzeTrend(
  records: ClimateRecord[],
  variable: ClimateVariable
): TrendResult {
  const monthly = aggregateMonthlyGlobal(records, variable);
  const xs = monthly.map((d) => d.yearDecimal);
  const ys = monthly.map((d) => d.value);
  const { slope, rSquared } = linearRegression(xs, ys);

  const firstYear = xs.length ? Math.floor(xs[0]) : 0;
  const lastYear = xs.length ? Math.ceil(xs[xs.length - 1]) : 0;
  const firstYearValues = ys.filter((_, i) => Math.floor(xs[i]) === firstYear);
  const lastYearValues = ys.filter((_, i) => Math.ceil(xs[i]) === lastYear);
  const startMean = firstYearValues.length ? mean(firstYearValues) : 0;
  const endMean = lastYearValues.length ? mean(lastYearValues) : 0;

  const slopePerDecade = slope * 10;
  let direction: TrendResult["direction"] = "stable";
  if (Math.abs(slopePerDecade) > 0.05) {
    direction = slopePerDecade > 0 ? "increasing" : "decreasing";
  }

  return {
    variable,
    slopePerYear: slope,
    slopePerDecade,
    rSquared,
    totalChange: endMean - startMean,
    startMean,
    endMean,
    direction,
  };
}

interface MonthlyPoint {
  date: string;
  yearDecimal: number;
  year: number;
  month: number;
  value: number;
}

/**
 * Aggregate records to monthly global mean for a variable (averages across regions).
 */
export function aggregateMonthlyGlobal(
  records: ClimateRecord[],
  variable: ClimateVariable
): MonthlyPoint[] {
  const byKey = new Map<string, { sum: number; count: number }>();
  for (const r of records) {
    const key = `${r.year}-${r.month}`;
    const existing = byKey.get(key) ?? { sum: 0, count: 0 };
    existing.sum += r[variable] as number;
    existing.count += 1;
    byKey.set(key, existing);
  }
  const points: MonthlyPoint[] = [];
  for (const [key, { sum, count }] of byKey) {
    const [y, m] = key.split("-").map(Number);
    points.push({
      date: `${y}-${String(m).padStart(2, "0")}-15`,
      yearDecimal: y + (m - 1) / 12,
      year: y,
      month: m,
      value: sum / count,
    });
  }
  points.sort((a, b) => a.yearDecimal - b.yearDecimal);
  return points;
}

/**
 * Aggregate to yearly global mean.
 */
export function aggregateYearlyGlobal(
  records: ClimateRecord[],
  variable: ClimateVariable
): { year: number; value: number }[] {
  const byYear = new Map<number, { sum: number; count: number }>();
  for (const r of records) {
    const existing = byYear.get(r.year) ?? { sum: 0, count: 0 };
    existing.sum += r[variable] as number;
    existing.count += 1;
    byYear.set(r.year, existing);
  }
  const out = [...byYear.entries()].map(([year, { sum, count }]) => ({
    year,
    value: sum / count,
  }));
  out.sort((a, b) => a.year - b.year);
  return out;
}

/**
 * Z-score based anomaly detection per variable per region.
 * Months whose value deviates more than `threshold` standard deviations from
 * the long-term mean for that calendar month are flagged as anomalies.
 */
export function detectAnomalies(
  records: ClimateRecord[],
  variables: ClimateVariable[],
  threshold = 2.5
): AnomalyPoint[] {
  const anomalies: AnomalyPoint[] = [];
  for (const variable of variables) {
    for (const region of new Set(records.map((r) => r.region))) {
      const regionRecords = records.filter((r) => r.region === region);
      // Group by calendar month to compute seasonal baseline.
      const byMonth = new Map<number, number[]>();
      for (const r of regionRecords) {
        const arr = byMonth.get(r.month) ?? [];
        arr.push(r[variable] as number);
        byMonth.set(r.month, arr);
      }
      const statsByMonth = new Map<number, { m: number; sd: number }>();
      for (const [m, vals] of byMonth) {
        statsByMonth.set(m, { m: mean(vals), sd: standardDeviation(vals) });
      }
      for (const r of regionRecords) {
        const stats = statsByMonth.get(r.month);
        if (!stats || stats.sd === 0) continue;
        const value = r[variable] as number;
        const z = (value - stats.m) / stats.sd;
        if (Math.abs(z) >= threshold) {
          const abs = Math.abs(z);
          const severity: AnomalyPoint["severity"] =
            abs >= 4 ? "extreme" : abs >= 3.5 ? "high" : abs >= 3 ? "moderate" : "low";
          anomalies.push({
            date: r.date,
            year: r.year,
            month: r.month,
            region,
            variable,
            value,
            expected: Number(stats.m.toFixed(2)),
            zscore: Number(z.toFixed(2)),
            severity,
          });
        }
      }
    }
  }
  anomalies.sort((a, b) => a.date.localeCompare(b.date));
  return anomalies;
}

/**
 * Simple forecasting model: linear trend + average seasonal cycle, projected
 * forward `horizonYears` years. Confidence band from residual standard error.
 */
export function forecastVariable(
  records: ClimateRecord[],
  variable: ClimateVariable,
  horizonYears = 15
): ForecastPoint[] {
  const monthly = aggregateMonthlyGlobal(records, variable);
  if (monthly.length === 0) return [];

  const xs = monthly.map((d) => d.yearDecimal);
  const ys = monthly.map((d) => d.value);
  const { slope, intercept, rSquared } = linearRegression(xs, ys);

  // Residuals and their std dev -> confidence band.
  const residuals = monthly.map((d, i) => d.value - (slope * xs[i] + intercept));
  const residualStd = standardDeviation(residuals);
  const bandWidth = 1.96 * residualStd * Math.sqrt(1 + 1 / monthly.length);

  // Average seasonal residual per calendar month.
  const seasonalByMonth = new Map<number, number[]>();
  for (let i = 0; i < monthly.length; i++) {
    const m = monthly[i].month;
    const arr = seasonalByMonth.get(m) ?? [];
    arr.push(residuals[i]);
    seasonalByMonth.set(m, arr);
  }
  const seasonalMean = new Map<number, number>();
  for (const [m, vals] of seasonalByMonth) {
    seasonalMean.set(m, mean(vals));
  }

  const out: ForecastPoint[] = [];
  const lastYearDecimal = xs[xs.length - 1];
  const endYear = Math.floor(lastYearDecimal);
  const startHistYear = Math.floor(xs[0]);

  // Historical fitted values for context.
  for (const point of monthly) {
    const fitted = slope * point.yearDecimal + intercept + (seasonalMean.get(point.month) ?? 0);
    out.push({
      date: point.date,
      year: point.year,
      month: point.month,
      region: "Global",
      variable,
      historical: Number(point.value.toFixed(2)),
      forecast: Number(fitted.toFixed(2)),
      lower: null,
      upper: null,
    });
  }

  // Future forecast (monthly steps).
  const totalFutureMonths = horizonYears * 12;
  let year = endYear;
  let month = monthly[monthly.length - 1].month;
  for (let i = 1; i <= totalFutureMonths; i++) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    const yearDecimal = year + (month - 1) / 12;
    const forecast = slope * yearDecimal + intercept + (seasonalMean.get(month) ?? 0);
    out.push({
      date: `${year}-${String(month).padStart(2, "0")}-15`,
      year,
      month,
      region: "Global",
      variable,
      historical: null,
      forecast: Number(forecast.toFixed(2)),
      lower: Number((forecast - bandWidth).toFixed(2)),
      upper: Number((forecast + bandWidth).toFixed(2)),
    });
  }

  void startHistYear;
  void rSquared;
  return out;
}

/**
 * Build a high-level summary of the dataset for the dashboard header.
 */
export function summarizeDataset(records: ClimateRecord[]): DatasetSummary {
  const years = records.map((r) => r.year);
  const regions = [...new Set(records.map((r) => r.region))].sort();
  const means = {} as DatasetSummary["means"];
  const mins = {} as DatasetSummary["mins"];
  const maxs = {} as DatasetSummary["maxs"];
  for (const v of ALL_VARIABLES) {
    const vals = records.map((r) => r[v] as number);
    means[v] = Number(mean(vals).toFixed(2));
    mins[v] = Number(Math.min(...vals).toFixed(2));
    maxs[v] = Number(Math.max(...vals).toFixed(2));
  }
  const anomalies = detectAnomalies(records, ALL_VARIABLES).length;
  return {
    totalRecords: records.length,
    yearRange: `${Math.min(...years)}–${Math.max(...years)}`,
    regions,
    variables: ALL_VARIABLES,
    means,
    mins,
    maxs,
    missingCount: 0,
    anomalies,
  };
}

/**
 * Correlation matrix across all variables, computed on the full dataset.
 */
export function correlationMatrix(
  records: ClimateRecord[]
): { variable: ClimateVariable; values: Record<ClimateVariable, number> }[] {
  const result = ALL_VARIABLES.map((v) => {
    const values = {} as Record<ClimateVariable, number>;
    for (const w of ALL_VARIABLES) {
      if (v === w) {
        values[w] = 1;
      } else {
        const xs = records.map((r) => r[v] as number);
        const ys = records.map((r) => r[w] as number);
        values[w] = Number(correlation(xs, ys).toFixed(3));
      }
    }
    return { variable: v, values };
  });
  return result;
}

/**
 * Pivot the data into a month (row) x year (col) matrix of mean values,
 * used for the seasonal heatmap.
 */
export function monthlyYearPivot(
  records: ClimateRecord[],
  variable: ClimateVariable
): { years: number[]; matrix: number[][] } {
  const years = [...new Set(records.map((r) => r.year))].sort((a, b) => a - b);
  const monthYearValue = new Map<string, { sum: number; count: number }>();
  for (const r of records) {
    const key = `${r.month}-${r.year}`;
    const existing = monthYearValue.get(key) ?? { sum: 0, count: 0 };
    existing.sum += r[variable] as number;
    existing.count += 1;
    monthYearValue.set(key, existing);
  }
  const matrix: number[][] = [];
  for (let month = 1; month <= 12; month++) {
    const row: number[] = [];
    for (const year of years) {
      const entry = monthYearValue.get(`${month}-${year}`);
      row.push(entry ? entry.sum / entry.count : 0);
    }
    matrix.push(row);
  }
  return { years, matrix };
}

// Core climate data types used across the analyzer.

export type ClimateVariable =
  | "temperature"
  | "rainfall"
  | "humidity"
  | "co2"
  | "sea_level";

export interface ClimateRecord {
  date: string; // ISO YYYY-MM-DD
  year: number;
  month: number; // 1-12
  region: string;
  temperature: number; // °C
  rainfall: number; // mm
  humidity: number; // %
  co2: number; // ppm
  sea_level: number; // mm (relative anomaly)
}

export interface DatasetConfig {
  startYear: number;
  endYear: number;
  regions: string[];
  warmingTrend: number; // °C per decade
  anomalyRate: number; // 0-1, fraction of months flagged as anomalies
  seed: number;
}

export interface AnomalyPoint {
  date: string;
  year: number;
  month: number;
  region: string;
  variable: ClimateVariable;
  value: number;
  expected: number;
  zscore: number;
  severity: "low" | "moderate" | "high" | "extreme";
}

export interface TrendResult {
  variable: ClimateVariable;
  slopePerYear: number;
  slopePerDecade: number;
  rSquared: number;
  totalChange: number;
  startMean: number;
  endMean: number;
  direction: "increasing" | "decreasing" | "stable";
}

export interface ForecastPoint {
  date: string;
  year: number;
  month: number;
  region: string;
  variable: ClimateVariable;
  historical: number | null;
  forecast: number | null;
  lower: number | null;
  upper: number | null;
}

export interface DatasetSummary {
  totalRecords: number;
  yearRange: string;
  regions: string[];
  variables: ClimateVariable[];
  means: Record<ClimateVariable, number>;
  mins: Record<ClimateVariable, number>;
  maxs: Record<ClimateVariable, number>;
  missingCount: number;
  anomalies: number;
}

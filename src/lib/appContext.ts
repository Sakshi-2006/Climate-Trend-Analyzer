import { createContext, useContext } from "react";
import type {
  AnomalyPoint,
  ClimateRecord,
  ClimateVariable,
  DatasetConfig,
  DatasetSummary,
} from "@/lib/climate";

export type ViewKey =
  | "dashboard"
  | "data"
  | "eda"
  | "trends"
  | "anomalies"
  | "forecast"
  | "insights";

export interface AppState {
  records: ClimateRecord[];
  config: DatasetConfig | null;
  summary: DatasetSummary | null;
  anomalies: AnomalyPoint[];
  activeVariable: ClimateVariable;
  setActiveVariable: (v: ClimateVariable) => void;
  setDataset: (records: ClimateRecord[], config: DatasetConfig) => void;
  view: ViewKey;
  setView: (v: ViewKey) => void;
}

export const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppContext");
  return ctx;
}

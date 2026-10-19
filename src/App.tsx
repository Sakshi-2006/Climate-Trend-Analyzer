import { useCallback, useMemo, useState } from "react";
import {
  Globe2,
  Database,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  LineChart as LineChartIcon,
  Lightbulb,
  CloudSun,
} from "lucide-react";
import type { ClimateRecord, ClimateVariable, DatasetConfig } from "@/lib/climate";
import {
  DEFAULT_REGIONS,
  detectAnomalies,
  generateDataset,
  summarizeDataset,
  ALL_VARIABLES,
} from "@/lib/climate";
import { AppContext, type ViewKey } from "@/lib/appContext";
import { DashboardView } from "@/views/DashboardView";
import { DataView } from "@/views/DataView";
import { EdaView } from "@/views/EdaView";
import { TrendsView } from "@/views/TrendsView";
import { AnomaliesView } from "@/views/AnomaliesView";
import { ForecastView } from "@/views/ForecastView";
import { InsightsView } from "@/views/InsightsView";

const NAV: { key: ViewKey; label: string; icon: typeof Globe2 }[] = [
  { key: "dashboard", label: "Dashboard", icon: Globe2 },
  { key: "data", label: "Data Generation", icon: Database },
  { key: "eda", label: "Exploratory Analysis", icon: BarChart3 },
  { key: "trends", label: "Trend Analysis", icon: TrendingUp },
  { key: "anomalies", label: "Anomaly Detection", icon: AlertTriangle },
  { key: "forecast", label: "Forecasting", icon: LineChartIcon },
  { key: "insights", label: "Insights & Report", icon: Lightbulb },
];

export default function App() {
  const [records, setRecords] = useState<ClimateRecord[]>([]);
  const [config, setConfig] = useState<DatasetConfig | null>(null);
  const [summary, setSummary] = useState<ReturnType<typeof summarizeDataset> | null>(null);
  const [activeVariable, setActiveVariable] = useState<ClimateVariable>("temperature");
  const [view, setView] = useState<ViewKey>("dashboard");

  const anomalies = useMemo(
    () => (records.length ? detectAnomalies(records, ALL_VARIABLES) : []),
    [records]
  );

  const setDataset = useCallback((newRecords: ClimateRecord[], newConfig: DatasetConfig) => {
    setRecords(newRecords);
    setConfig(newConfig);
    setSummary(summarizeDataset(newRecords));
    setView("dashboard");
  }, []);

  // Bootstrap an initial dataset on first load so the app is immediately usable.
  const bootstrapIfNeeded = useCallback(() => {
    if (records.length > 0) return;
    const initialConfig: DatasetConfig = {
      startYear: 1980,
      endYear: 2023,
      regions: DEFAULT_REGIONS,
      warmingTrend: 0.35,
      anomalyRate: 0.04,
      seed: 42,
    };
    const initialRecords = generateDataset(initialConfig);
    setDataset(initialRecords, initialConfig);
  }, [records.length, setDataset]);

  bootstrapIfNeeded();

  const ctx = {
    records,
    config,
    summary,
    anomalies,
    activeVariable,
    setActiveVariable,
    setDataset,
    view,
    setView,
  };

  return (
    <AppContext.Provider value={ctx}>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Header />
        <div className="flex">
          <Sidebar current={view} onNavigate={setView} />
          <main className="flex-1 min-w-0 px-6 md:px-10 py-8 max-w-[1400px] mx-auto w-full">
            {view === "dashboard" && <DashboardView />}
            {view === "data" && <DataView />}
            {view === "eda" && <EdaView />}
            {view === "trends" && <TrendsView />}
            {view === "anomalies" && <AnomaliesView />}
            {view === "forecast" && <ForecastView />}
            {view === "insights" && <InsightsView />}
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}

function Header() {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center text-white shadow-sm">
            <CloudSun size={22} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900 leading-tight">Climate Trend Analyzer</h1>
            <p className="text-xs text-slate-500">Synthetic climate data · EDA · trends · anomalies · forecasting</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live analysis environment
        </div>
      </div>
    </header>
  );
}

function Sidebar({
  current,
  onNavigate,
}: {
  current: ViewKey;
  onNavigate: (v: ViewKey) => void;
}) {
  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)] sticky top-16 self-start hidden md:block">
      <nav className="p-3 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="px-4 py-3 mt-2 mx-3 rounded-lg bg-slate-50 border border-slate-100">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Datasets are simulated in your browser. Save analyses to persist them across reloads.
        </p>
      </div>
    </aside>
  );
}

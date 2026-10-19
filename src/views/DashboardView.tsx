import { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  Database as DbIcon,
  Globe2,
  TrendingUp,
} from "lucide-react";
import { useApp } from "@/lib/appContext";
import {
  ALL_VARIABLES,
  VARIABLE_COLORS,
  VARIABLE_LABELS,
  VARIABLE_SHORT,
  VARIABLE_UNITS,
  aggregateMonthlyGlobal,
  analyzeTrend,
} from "@/lib/climate";
import { Card, CardHeader, StatTile, Badge, Button } from "@/components/ui";
import { LineChart } from "@/components/charts/Charts";

export function DashboardView() {
  const { records, config, summary, anomalies, setView, setActiveVariable, activeVariable } = useApp();

  const monthlyTemp = useMemo(
    () => (records.length ? aggregateMonthlyGlobal(records, "temperature") : []),
    [records]
  );
  const trend = useMemo(
    () => (records.length ? analyzeTrend(records, "temperature") : null),
    [records]
  );

  if (!summary || !config) {
    return (
      <div className="text-slate-500 text-sm">Loading dataset…</div>
    );
  }

  const lineSeries = [
    {
      points: monthlyTemp.map((p) => ({ x: p.yearDecimal, y: p.value })),
      color: VARIABLE_COLORS.temperature,
      label: "Monthly mean",
      width: 1,
    },
    {
      points: rolling12(monthlyTemp.map((p) => ({ x: p.yearDecimal, y: p.value }))),
      color: "#0f172a",
      label: "12-mo rolling",
      width: 2.5,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Climate overview</h2>
          <p className="text-sm text-slate-500 mt-1">
            A snapshot of the simulated dataset across {summary.regions.length} regions from {summary.yearRange}.
          </p>
        </div>
        <Button onClick={() => setView("data")} variant="secondary" size="sm">
          Configure dataset
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Records"
          value={summary.totalRecords.toLocaleString()}
          icon={<DbIcon size={14} />}
          accent="slate"
          hint="Monthly observations"
        />
        <StatTile
          label="Year span"
          value={summary.yearRange}
          icon={<Calendar size={14} />}
          accent="blue"
          hint={`${config.endYear - config.startYear + 1} years`}
        />
        <StatTile
          label="Regions"
          value={summary.regions.length}
          icon={<Globe2 size={14} />}
          accent="teal"
          hint={summary.regions.join(", ")}
        />
        <StatTile
          label="Anomalies"
          value={summary.anomalies}
          icon={<AlertTriangle size={14} />}
          accent="amber"
          hint="Z-score |z| ≥ 2.5"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Global temperature over time"
            subtitle="Monthly mean (all regions) with 12-month rolling average"
            icon={<TrendingUp size={16} />}
            right={
              <Badge color={trend?.direction === "increasing" ? "red" : trend?.direction === "decreasing" ? "blue" : "slate"}>
                {trend ? `${trend.direction} · ${trend.slopePerDecade.toFixed(2)} °C/decade` : "—"}
              </Badge>
            }
          />
          <div className="p-4">
            <LineChart
              series={lineSeries}
              xLabel="Year"
              yLabel="Temperature (°C)"
              yFormat={(v) => v.toFixed(1)}
              height={300}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Variable means" subtitle="Across all records" icon={<Activity size={16} />} />
          <div className="p-4 space-y-2">
            {ALL_VARIABLES.map((v) => {
              const active = activeVariable === v;
              return (
                <button
                  key={v}
                  onClick={() => {
                    setActiveVariable(v);
                    setView("trends");
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    active ? "bg-slate-100" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-sm" style={{ background: VARIABLE_COLORS[v] }} />
                    <span className="font-medium text-slate-700">{VARIABLE_SHORT[v]}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold tabular-nums text-slate-900">
                      {summary.means[v].toFixed(2)} <span className="text-xs text-slate-400">{VARIABLE_UNITS[v]}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 tabular-nums">
                      {summary.mins[v].toFixed(1)} – {summary.maxs[v].toFixed(1)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Dataset configuration" subtitle="Parameters used to generate this dataset" icon={<DbIcon size={16} />} />
          <div className="p-4 grid grid-cols-2 gap-3 text-sm">
            <ConfigRow label="Start year" value={String(config.startYear)} />
            <ConfigRow label="End year" value={String(config.endYear)} />
            <ConfigRow label="Warming trend" value={`${config.warmingTrend} °C/decade`} />
            <ConfigRow label="Anomaly rate" value={`${(config.anomalyRate * 100).toFixed(1)} %`} />
            <ConfigRow label="Seed" value={String(config.seed)} />
            <ConfigRow label="Variables" value={String(ALL_VARIABLES.length)} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Analysis modules" subtitle="Jump to any stage of the pipeline" icon={<Activity size={16} />} />
          <div className="p-4 grid grid-cols-2 gap-3">
            <ModuleLink label="Exploratory Analysis" desc="Distributions, correlations, heatmaps" onClick={() => setView("eda")} />
            <ModuleLink label="Trend Analysis" desc="Per-variable regression & direction" onClick={() => setView("trends")} />
            <ModuleLink label="Anomaly Detection" desc={`${anomalies.length} flagged events`} onClick={() => setView("anomalies")} />
            <ModuleLink label="Forecasting" desc="15-year projection with bands" onClick={() => setView("forecast")} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-slate-50 rounded-md px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800 tabular-nums">{value}</span>
    </div>
  );
}

function ModuleLink({ label, desc, onClick }: { label: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left p-3 rounded-lg border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-colors"
    >
      <div className="text-sm font-semibold text-slate-800">{label}</div>
      <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
    </button>
  );
}

function rolling12(points: { x: number; y: number }[]): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const window = 12;
  for (let i = 0; i < points.length; i++) {
    if (i < window - 1) {
      out.push({ x: points[i].x, y: NaN });
      continue;
    }
    let s = 0;
    for (let j = i - window + 1; j <= i; j++) s += points[j].y;
    out.push({ x: points[i].x, y: s / window });
  }
  // Filter NaN for the chart.
  return out.filter((p) => !Number.isNaN(p.y));
}

void VARIABLE_LABELS;

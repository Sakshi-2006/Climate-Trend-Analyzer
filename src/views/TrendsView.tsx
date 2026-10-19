import { useMemo } from "react";
import { TrendingUp, ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useApp } from "@/lib/appContext";
import {
  ALL_VARIABLES,
  VARIABLE_COLORS,
  VARIABLE_SHORT,
  VARIABLE_UNITS,
  analyzeTrend,
  aggregateMonthlyGlobal,
  aggregateYearlyGlobal,
  rollingMean,
} from "@/lib/climate";
import { Card, CardHeader, Badge, StatTile } from "@/components/ui";
import { LineChart } from "@/components/charts/Charts";

export function TrendsView() {
  const { records, activeVariable, setActiveVariable } = useApp();

  const trends = useMemo(
    () => (records.length ? ALL_VARIABLES.map((v) => analyzeTrend(records, v)) : []),
    [records]
  );
  const monthly = useMemo(
    () => (records.length ? aggregateMonthlyGlobal(records, activeVariable) : []),
    [records, activeVariable]
  );
  const yearly = useMemo(
    () => (records.length ? aggregateYearlyGlobal(records, activeVariable) : []),
    [records, activeVariable]
  );
  const rolling = useMemo(
    () => rollingMean(monthly.map((m) => m.value), 12),
    [monthly]
  );

  if (!records.length) return <div className="text-sm text-slate-500">No dataset loaded.</div>;

  const activeTrend = trends.find((t) => t.variable === activeVariable);

  const lineSeries = [
    {
      points: monthly.map((p, i) => ({ x: p.yearDecimal, y: p.value })),
      color: VARIABLE_COLORS[activeVariable],
      label: "Monthly",
      width: 1,
    },
    {
      points: rolling
        .map((v, i) => (v === null ? null : { x: monthly[i].yearDecimal, y: v }))
        .filter((p): p is { x: number; y: number } => p !== null),
      color: "#0f172a",
      label: "12-mo rolling",
      width: 2.5,
    },
    {
      points: yearly.map((p) => ({ x: p.year, y: p.value })),
      color: "#f59e0b",
      label: "Yearly mean",
      width: 2,
      dashed: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Trend analysis</h2>
        <p className="text-sm text-slate-500 mt-1">
          Ordinary least-squares regression per variable. The slope tells you how fast each climate indicator is changing per decade.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {trends.map((t) => {
          const active = activeVariable === t.variable;
          const dirIcon =
            t.direction === "increasing" ? <ArrowUpRight size={14} /> :
            t.direction === "decreasing" ? <ArrowDownRight size={14} /> :
            <Minus size={14} />;
          const dirColor =
            t.direction === "increasing" ? "red" :
            t.direction === "decreasing" ? "blue" : "slate";
          return (
            <button
              key={t.variable}
              onClick={() => setActiveVariable(t.variable)}
              className={`text-left p-4 rounded-xl border transition-all ${
                active
                  ? "border-slate-900 bg-white shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{VARIABLE_SHORT[t.variable]}</span>
                <span className="h-3 w-3 rounded-sm" style={{ background: VARIABLE_COLORS[t.variable] }} />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-lg font-semibold tabular-nums text-slate-900">{t.slopePerDecade.toFixed(3)}</span>
                <span className="text-xs text-slate-500">{VARIABLE_UNITS[t.variable]}/decade</span>
              </div>
              <div className="mt-2">
                <Badge color={dirColor as "red" | "blue" | "slate"}>
                  {dirIcon}
                  {t.direction}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader
          title={`${VARIABLE_SHORT[activeVariable]} trend`}
          subtitle="Monthly values, 12-month rolling mean, and yearly mean"
          icon={<TrendingUp size={16} />}
          right={
            activeTrend && (
              <Badge color={activeTrend.direction === "increasing" ? "red" : activeTrend.direction === "decreasing" ? "blue" : "slate"}>
                r² = {activeTrend.rSquared.toFixed(3)}
              </Badge>
            )
          }
        />
        <div className="p-4">
          <LineChart
            series={lineSeries}
            xLabel="Year"
            yLabel={VARIABLE_UNITS[activeVariable]}
            yFormat={(v) => v.toFixed(1)}
            height={320}
          />
        </div>
      </Card>

      {activeTrend && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile
            label="Slope per year"
            value={activeTrend.slopePerYear.toFixed(4)}
            unit={VARIABLE_UNITS[activeVariable]}
            accent={activeTrend.direction === "increasing" ? "red" : activeTrend.direction === "decreasing" ? "blue" : "slate"}
          />
          <StatTile
            label="Slope per decade"
            value={activeTrend.slopePerDecade.toFixed(3)}
            unit={VARIABLE_UNITS[activeVariable]}
            accent={activeTrend.direction === "increasing" ? "red" : activeTrend.direction === "decreasing" ? "blue" : "slate"}
          />
          <StatTile
            label="Total change"
            value={activeTrend.totalChange.toFixed(2)}
            unit={VARIABLE_UNITS[activeVariable]}
            hint="End-year mean − start-year mean"
          />
          <StatTile
            label="R² (fit quality)"
            value={activeTrend.rSquared.toFixed(3)}
            accent="violet"
            hint="1.0 = perfect linear fit"
          />
        </div>
      )}

      <Card>
        <CardHeader title="Per-region comparison" subtitle={`${VARIABLE_SHORT[activeVariable]} by region (yearly mean)`} icon={<TrendingUp size={16} />} />
        <div className="p-4">
          <RegionTrendChart records={records} variable={activeVariable} />
        </div>
      </Card>
    </div>
  );
}

const REGION_COLORS: Record<string, string> = {
  Tropical: "#f97316",
  "Northern Temperate": "#3b82f6",
  "Southern Temperate": "#14b8a6",
  Arid: "#eab308",
  Polar: "#06b6d4",
};

function RegionTrendChart({ records, variable }: { records: typeof import("@/lib/climate/types").ClimateRecord[]; variable: string }) {
  const regions = [...new Set(records.map((r) => r.region))];
  const series = regions.map((region) => {
    const regionRecords = records.filter((r) => r.region === region);
    const yearly = aggregateYearlyGlobal(regionRecords, variable as never);
    return {
      points: yearly.map((p) => ({ x: p.year, y: p.value })),
      color: REGION_COLORS[region] ?? "#64748b",
      label: region,
      width: 2,
    };
  });
  return (
    <LineChart
      series={series}
      xLabel="Year"
      yLabel={VARIABLE_UNITS[variable as keyof typeof VARIABLE_UNITS]}
      yFormat={(v) => v.toFixed(1)}
      height={300}
    />
  );
}

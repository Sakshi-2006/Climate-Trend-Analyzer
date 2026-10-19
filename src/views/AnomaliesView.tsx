import { useMemo, useState } from "react";
import { AlertTriangle, Flame, Droplets, Snowflake, Wind } from "lucide-react";
import { useApp } from "@/lib/appContext";
import {
  ALL_VARIABLES,
  VARIABLE_COLORS,
  VARIABLE_SHORT,
  VARIABLE_UNITS,
  type AnomalyPoint,
  type ClimateVariable,
} from "@/lib/climate";
import { Card, CardHeader, Badge, StatTile, Button } from "@/components/ui";
import { ScatterChart } from "@/components/charts/Charts";

const SEVERITY_COLOR: Record<AnomalyPoint["severity"], string> = {
  low: "#fbbf24",
  moderate: "#f97316",
  high: "#ef4444",
  extreme: "#7f1d1d",
};

export function AnomaliesView() {
  const { records, anomalies } = useApp();
  const [filterVar, setFilterVar] = useState<ClimateVariable | "all">("all");
  const [filterRegion, setFilterRegion] = useState<string | "all">("all");

  const filtered = useMemo(
    () =>
      anomalies.filter(
        (a) =>
          (filterVar === "all" || a.variable === filterVar) &&
          (filterRegion === "all" || a.region === filterRegion)
      ),
    [anomalies, filterVar, filterRegion]
  );

  const counts = useMemo(() => {
    const byVar: Record<string, number> = {};
    const bySeverity: Record<AnomalyPoint["severity"], number> = { low: 0, moderate: 0, high: 0, extreme: 0 };
    for (const a of anomalies) {
      byVar[a.variable] = (byVar[a.variable] ?? 0) + 1;
      bySeverity[a.severity] += 1;
    }
    return { byVar, bySeverity };
  }, [anomalies]);

  if (!records.length) return <div className="text-sm text-slate-500">No dataset loaded.</div>;

  const regions = [...new Set(records.map((r) => r.region))];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Anomaly detection</h2>
        <p className="text-sm text-slate-500 mt-1">
          Each month is compared against the long-term baseline for its calendar month and region. Months where |z| ≥ 2.5 are flagged.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Total anomalies" value={anomalies.length} accent="amber" icon={<AlertTriangle size={14} />} />
        <StatTile label="Extreme (|z|≥4)" value={counts.bySeverity.extreme} accent="red" icon={<Flame size={14} />} />
        <StatTile label="High (3.5–4)" value={counts.bySeverity.high} accent="red" />
        <StatTile label="Moderate (3–3.5)" value={counts.bySeverity.moderate} accent="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Anomaly timeline" subtitle="All variables · z-score magnitude" icon={<AlertTriangle size={16} />} />
          <div className="p-4">
            <AnomalyTimeline anomalies={anomalies} />
          </div>
        </Card>

        <Card>
          <CardHeader title="By variable" subtitle="Count of flagged events" icon={<AlertTriangle size={16} />} />
          <div className="p-4 space-y-2">
            {ALL_VARIABLES.map((v) => {
              const c = counts.byVar[v] ?? 0;
              const max = Math.max(...Object.values(counts.byVar), 1);
              return (
                <div key={v} className="flex items-center gap-3">
                  <span className="w-20 text-xs font-medium text-slate-600">{VARIABLE_SHORT[v]}</span>
                  <div className="flex-1 h-6 bg-slate-100 rounded">
                    <div
                      className="h-full rounded"
                      style={{ width: `${(c / max) * 100}%`, background: VARIABLE_COLORS[v] }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs tabular-nums text-slate-700 font-medium">{c}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Anomaly table"
          subtitle={`${filtered.length} events (of ${anomalies.length})`}
          icon={<AlertTriangle size={16} />}
          right={
            <div className="flex items-center gap-2">
              <select value={filterVar} onChange={(e) => setFilterVar(e.target.value as ClimateVariable | "all")} className="anomaly-select">
                <option value="all">All variables</option>
                {ALL_VARIABLES.map((v) => (
                  <option key={v} value={v}>{VARIABLE_SHORT[v]}</option>
                ))}
              </select>
              <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className="anomaly-select">
                <option value="all">All regions</option>
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          }
        />
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide sticky top-0">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Date</th>
                <th className="text-left px-4 py-2 font-medium">Region</th>
                <th className="text-left px-4 py-2 font-medium">Variable</th>
                <th className="text-right px-4 py-2 font-medium">Value</th>
                <th className="text-right px-4 py-2 font-medium">Expected</th>
                <th className="text-right px-4 py-2 font-medium">z</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Severity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((a, i) => {
                const icon = anomalyIcon(a);
                return (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-700">{a.date}</td>
                    <td className="px-4 py-2 text-slate-700">{a.region}</td>
                    <td className="px-4 py-2 text-slate-700">{VARIABLE_SHORT[a.variable]}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-800 font-medium">
                      {a.value.toFixed(2)} <span className="text-xs text-slate-400">{VARIABLE_UNITS[a.variable]}</span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-500">{a.expected.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      <span style={{ color: a.zscore > 0 ? "#ef4444" : "#3b82f6" }} className="font-medium">
                        {a.zscore > 0 ? "+" : ""}{a.zscore.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      <span className="inline-flex items-center gap-1.5">{icon}{anomalyType(a)}</span>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: SEVERITY_COLOR[a.severity] }}
                        title={a.severity}
                      />
                      <span className="ml-2 text-xs text-slate-500 capitalize">{a.severity}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > 200 && (
            <div className="px-4 py-3 text-xs text-slate-400 bg-slate-50 border-t border-slate-100">
              Showing first 200 of {filtered.length} matching events.
            </div>
          )}
        </div>
      </Card>

      <style>{`
        .anomaly-select {
          padding: 0.375rem 0.5rem;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.5rem;
          font-size: 0.75rem;
          background: white;
          color: rgb(15 23 42);
        }
      `}</style>
    </div>
  );
}

function anomalyType(a: AnomalyPoint): string {
  if (a.variable === "temperature") return a.zscore > 0 ? "Heatwave" : "Cold snap";
  if (a.variable === "rainfall") return a.zscore > 0 ? "Extreme rainfall" : "Drought";
  if (a.variable === "humidity") return a.zscore > 0 ? "Humid spike" : "Dry spell";
  if (a.variable === "co2") return a.zscore > 0 ? "CO₂ spike" : "CO₂ dip";
  return a.zscore > 0 ? "Sea-level surge" : "Sea-level dip";
}

function anomalyIcon(a: AnomalyPoint) {
  if (a.variable === "temperature") return a.zscore > 0 ? <Flame size={12} className="text-red-500" /> : <Snowflake size={12} className="text-blue-500" />;
  if (a.variable === "rainfall") return a.zscore > 0 ? <Droplets size={12} className="text-blue-500" /> : <Droplets size={12} className="text-amber-500" />;
  return <Wind size={12} className="text-slate-400" />;
}

function AnomalyTimeline({ anomalies }: { anomalies: AnomalyPoint[] }) {
  // Scatter on year vs z-score, colored by variable.
  const series = ALL_VARIABLES.map((v) => ({
    points: anomalies
      .filter((a) => a.variable === v)
      .map((a) => ({ x: a.year + (a.month - 1) / 12, y: a.zscore, color: SEVERITY_COLOR[a.severity] })),
    color: VARIABLE_COLORS[v],
    label: VARIABLE_SHORT[v],
  })).filter((s) => s.points.length > 0);

  if (series.length === 0) {
    return <div className="text-sm text-slate-400 py-12 text-center">No anomalies detected in the current dataset.</div>;
  }

  return (
    <ScatterChart
      series={series}
      xLabel="Year"
      yLabel="z-score"
      yFormat={(v) => v.toFixed(1)}
      height={300}
    />
  );
}

void Button;

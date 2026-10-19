import { useMemo } from "react";
import { BarChart3, Grid3x3, Spline } from "lucide-react";
import { useApp } from "@/lib/appContext";
import {
  ALL_VARIABLES,
  VARIABLE_COLORS,
  VARIABLE_SHORT,
  VARIABLE_UNITS,
  correlationMatrix,
  monthlyYearPivot,
  aggregateMonthlyGlobal,
} from "@/lib/climate";
import { Card, CardHeader, Badge } from "@/components/ui";
import { Heatmap, LineChart, ScatterChart } from "@/components/charts/Charts";

export function EdaView() {
  const { records, activeVariable, setActiveVariable } = useApp();

  const corr = useMemo(() => (records.length ? correlationMatrix(records) : []), [records]);
  const pivot = useMemo(
    () => (records.length ? monthlyYearPivot(records, activeVariable) : { years: [], matrix: [] }),
    [records, activeVariable]
  );
  const monthlyTemp = useMemo(
    () => (records.length ? aggregateMonthlyGlobal(records, activeVariable) : []),
    [records, activeVariable]
  );

  if (!records.length) {
    return <div className="text-sm text-slate-500">No dataset loaded.</div>;
  }

  const corrColors: string[] = ALL_VARIABLES.map((_, i) => VARIABLE_COLORS[ALL_VARIABLES[i]]);
  void corrColors;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Exploratory data analysis</h2>
        <p className="text-sm text-slate-500 mt-1">
          Distributions, seasonal structure, and cross-variable relationships in the simulated climate dataset.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ALL_VARIABLES.map((v) => {
          const active = activeVariable === v;
          return (
            <button
              key={v}
              onClick={() => setActiveVariable(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                active
                  ? "text-white border-transparent"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
              }`}
              style={active ? { background: VARIABLE_COLORS[v] } : undefined}
            >
              {VARIABLE_SHORT[v]}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title={`${VARIABLE_SHORT[activeVariable]} time series`}
            subtitle="Monthly global mean"
            icon={<Spline size={16} />}
            right={<Badge color="slate">{VARIABLE_UNITS[activeVariable]}</Badge>}
          />
          <div className="p-4">
            <LineChart
              series={[
                {
                  points: monthlyTemp.map((p) => ({ x: p.yearDecimal, y: p.value })),
                  color: VARIABLE_COLORS[activeVariable],
                  width: 1.5,
                },
              ]}
              xLabel="Year"
              yLabel={VARIABLE_UNITS[activeVariable]}
              yFormat={(v) => v.toFixed(1)}
              height={280}
              showLegend={false}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Correlation matrix" subtitle="Pearson r across variables" icon={<Grid3x3 size={16} />} />
          <div className="p-4">
            <CorrMatrix rows={corr} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={`Seasonal heatmap · ${VARIABLE_SHORT[activeVariable]}`}
          subtitle="Rows = calendar month, columns = year (global mean)"
          icon={<BarChart3 size={16} />}
        />
        <div className="p-4">
          <Heatmap
            matrix={pivot.matrix}
            rowLabels={MONTHS}
            colLabels={pivot.years.map(String)}
            height={300}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="CO₂ vs Temperature" subtitle="Monthly global means with OLS fit" icon={<Spline size={16} />} />
          <div className="p-4">
            <Co2TempScatter records={records} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Sea level vs Year" subtitle="Long-term rise trend" icon={<Spline size={16} />} />
          <div className="p-4">
            <LineChart
              series={[
                {
                  points: aggregateMonthlyGlobal(records, "sea_level").map((p) => ({ x: p.yearDecimal, y: p.value })),
                  color: VARIABLE_COLORS.sea_level,
                  width: 1.5,
                },
              ]}
              xLabel="Year"
              yLabel="Sea level (mm)"
              yFormat={(v) => v.toFixed(0)}
              height={280}
              showLegend={false}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function CorrMatrix({ rows }: { rows: { variable: string; values: Record<string, number> }[] }) {
  const labels = rows.map((r) => VARIABLE_SHORT[r.variable as keyof typeof VARIABLE_SHORT]);
  return (
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1"></th>
            {labels.map((l) => (
              <th key={l} className="px-2 py-1 text-slate-500 font-medium">{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.variable}>
              <td className="px-2 py-1 text-slate-500 font-medium">{labels[i]}</td>
              {ALL_VARIABLES.map((v) => {
                const val = row.values[v];
                const color = corrColor(val);
                return (
                  <td key={v} className="px-1 py-1">
                    <div
                      className="h-9 w-12 rounded flex items-center justify-center text-white font-medium tabular-nums"
                      style={{ background: color }}
                      title={`${VARIABLE_SHORT[row.variable as keyof typeof VARIABLE_SHORT]} vs ${VARIABLE_SHORT[v]}: ${val.toFixed(2)}`}
                    >
                      {val.toFixed(2)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function corrColor(r: number): string {
  // diverging red(-1) -> white(0) -> teal(+1)
  const t = (r + 1) / 2;
  if (t < 0.5) {
    const k = 1 - t * 2;
    return `rgb(${Math.round(239 + (255 - 239) * (1 - k))}, ${Math.round(68 + (255 - 68) * (1 - k))}, ${Math.round(68 + (255 - 68) * (1 - k))})`;
  }
  const k = (t - 0.5) * 2;
  return `rgb(${Math.round(20 + (255 - 20) * (1 - k))}, ${Math.round(184 + (255 - 184) * (1 - k))}, ${Math.round(166 + (255 - 166) * (1 - k))})`;
}

function Co2TempScatter({ records }: { records: typeof import("@/lib/climate/types").ClimateRecord[] }) {
  const monthlyCo2 = aggregateMonthlyGlobal(records, "co2");
  const monthlyTemp = aggregateMonthlyGlobal(records, "temperature");
  // Downsample to ~300 points for perf.
  const step = Math.max(1, Math.floor(monthlyCo2.length / 300));
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < monthlyCo2.length; i += step) {
    pts.push({ x: monthlyCo2[i].value, y: monthlyTemp[i].value });
  }
  return (
    <ScatterChart
      series={[{ points: pts, color: "#8b5cf2", label: "Month" }]}
      xLabel="CO₂ (ppm)"
      yLabel="Temperature (°C)"
      height={280}
    />
  );
}

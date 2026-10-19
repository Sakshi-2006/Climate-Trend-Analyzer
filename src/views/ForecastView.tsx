import { useMemo, useState } from "react";
import { LineChart as LineIcon, Sparkles } from "lucide-react";
import { useApp } from "@/lib/appContext";
import {
  ALL_VARIABLES,
  VARIABLE_COLORS,
  VARIABLE_SHORT,
  VARIABLE_UNITS,
  forecastVariable,
} from "@/lib/climate";
import { Card, CardHeader, Badge, StatTile, Button } from "@/components/ui";
import { LineChart } from "@/components/charts/Charts";

export function ForecastView() {
  const { records, activeVariable, setActiveVariable } = useApp();
  const [horizon, setHorizon] = useState(15);

  const forecast = useMemo(
    () => (records.length ? forecastVariable(records, activeVariable, horizon) : []),
    [records, activeVariable, horizon]
  );

  if (!records.length) return <div className="text-sm text-slate-500">No dataset loaded.</div>;

  const histPoints = forecast
    .filter((p) => p.historical !== null)
    .map((p) => ({ x: p.year + (p.month - 1) / 12, y: p.historical as number }));
  const fittedPoints = forecast
    .filter((p) => p.forecast !== null && p.historical !== null)
    .map((p) => ({ x: p.year + (p.month - 1) / 12, y: p.forecast as number }));
  const futurePoints = forecast
    .filter((p) => p.historical === null && p.forecast !== null)
    .map((p) => ({ x: p.year + (p.month - 1) / 12, y: p.forecast as number }));
  const bandPoints = forecast
    .filter((p) => p.lower !== null && p.upper !== null)
    .map((p) => ({
      x: p.year + (p.month - 1) / 12,
      yLow: p.lower as number,
      yHigh: p.upper as number,
    }));

  const lastHist = histPoints[histPoints.length - 1];
  const lastFuture = futurePoints[futurePoints.length - 1];
  const change = lastHist && lastFuture ? lastFuture.y - lastHist.y : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Forecasting</h2>
          <p className="text-sm text-slate-500 mt-1">
            Linear trend + seasonal cycle projected forward. The shaded band is a 95% confidence interval from residual standard error.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Horizon</label>
          <select
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="px-2 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
          >
            <option value={10}>10 years</option>
            <option value={15}>15 years</option>
            <option value={20}>20 years</option>
            <option value={30}>30 years</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ALL_VARIABLES.map((v) => {
          const active = activeVariable === v;
          return (
            <button
              key={v}
              onClick={() => setActiveVariable(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                active ? "text-white border-transparent" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
              }`}
              style={active ? { background: VARIABLE_COLORS[v] } : undefined}
            >
              {VARIABLE_SHORT[v]}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader
          title={`${VARIABLE_SHORT[activeVariable]} forecast`}
          subtitle={`Historical fit + ${horizon}-year projection with 95% CI`}
          icon={<LineIcon size={16} />}
          right={
            <Badge color={change > 0 ? "red" : change < 0 ? "blue" : "slate"}>
              Projected change: {change > 0 ? "+" : ""}{change.toFixed(2)} {VARIABLE_UNITS[activeVariable]}
            </Badge>
          }
        />
        <div className="p-4">
          <LineChart
            series={[
              { points: histPoints, color: VARIABLE_COLORS[activeVariable], label: "Historical", width: 1.5 },
              { points: fittedPoints, color: "#94a3b8", label: "Fitted", width: 1, dashed: true },
              { points: futurePoints, color: "#f59e0b", label: "Forecast", width: 2.5 },
            ]}
            bands={[{ points: bandPoints, color: "#f59e0b" }]}
            xLabel="Year"
            yLabel={VARIABLE_UNITS[activeVariable]}
            yFormat={(v) => v.toFixed(1)}
            height={340}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Forecast highlights" subtitle="Projections at end of horizon" icon={<Sparkles size={16} />} />
          <div className="p-4 space-y-3">
            <ForecastRow label="Latest historical value" value={lastHist?.y.toFixed(2)} unit={VARIABLE_UNITS[activeVariable]} />
            <ForecastRow label="Projected end value" value={lastFuture?.y.toFixed(2)} unit={VARIABLE_UNITS[activeVariable]} />
            <ForecastRow
              label="Net change"
              value={`${change > 0 ? "+" : ""}${change.toFixed(2)}`}
              unit={VARIABLE_UNITS[activeVariable]}
              highlight={change > 0 ? "red" : change < 0 ? "blue" : undefined}
            />
            <ForecastRow
              label="Annual rate"
              value={`${(change / horizon).toFixed(3)}`}
              unit={`${VARIABLE_UNITS[activeVariable]}/yr`}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="All-variable forecast summary" subtitle="Projected change over horizon" icon={<Sparkles size={16} />} />
          <div className="p-4 space-y-2">
            {ALL_VARIABLES.map((v) => {
              const f = forecastVariable(records, v, horizon);
              const lh = f.find((p) => p.historical !== null && p.forecast !== null);
              const lastH = f.filter((p) => p.historical !== null).pop();
              const lastF = f.filter((p) => p.historical === null).pop();
              void lh;
              const ch = lastH && lastF ? (lastF.forecast ?? 0) - (lastH.historical ?? 0) : 0;
              return (
                <div key={v} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm" style={{ background: VARIABLE_COLORS[v] }} />
                    <span className="text-sm font-medium text-slate-700">{VARIABLE_SHORT[v]}</span>
                  </div>
                  <span
                    className="text-sm font-semibold tabular-nums"
                    style={{ color: ch > 0 ? "#dc2626" : ch < 0 ? "#2563eb" : "#475569" }}
                  >
                    {ch > 0 ? "+" : ""}{ch.toFixed(2)} {VARIABLE_UNITS[v]}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Forecast points" value={futurePoints.length} accent="amber" />
        <StatTile label="Model" value="OLS + seasonal" accent="violet" />
        <StatTile label="Confidence" value="95%" accent="slate" hint="From residual std error" />
        <StatTile label="Horizon" value={horizon} unit="years" accent="teal" />
      </div>

      <div className="flex items-start gap-2 p-4 rounded-lg bg-amber-50 border border-amber-200">
        <Sparkles size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">
          This is a simple trend+seasonality model intended for educational demonstration. Production climate forecasts use ARIMA, Prophet, or neural sequence models trained on real observational and reanalysis data.
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setActiveVariable(activeVariable)} variant="ghost" size="sm">Refresh</Button>
      </div>
    </div>
  );
}

function ForecastRow({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value?: string;
  unit: string;
  highlight?: "red" | "blue";
}) {
  const color = highlight === "red" ? "text-red-600" : highlight === "blue" ? "text-blue-600" : "text-slate-900";
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${color}`}>
        {value ?? "—"} <span className="text-xs text-slate-400">{unit}</span>
      </span>
    </div>
  );
}

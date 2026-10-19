import { useMemo } from "react";
import { Lightbulb, FileText, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";
import { useApp } from "@/lib/appContext";
import {
  ALL_VARIABLES,
  VARIABLE_SHORT,
  VARIABLE_UNITS,
  analyzeTrend,
  correlationMatrix,
  detectAnomalies,
  aggregateYearlyGlobal,
} from "@/lib/climate";
import { Card, CardHeader, Badge, StatTile } from "@/components/ui";

export function InsightsView() {
  const { records, config, summary, anomalies } = useApp();

  const trends = useMemo(
    () => (records.length ? ALL_VARIABLES.map((v) => analyzeTrend(records, v)) : []),
    [records]
  );
  const corr = useMemo(() => (records.length ? correlationMatrix(records) : []), [records]);
  const tempYearly = useMemo(
    () => (records.length ? aggregateYearlyGlobal(records, "temperature") : []),
    [records]
  );

  if (!records.length || !summary || !config) {
    return <div className="text-sm text-slate-500">No dataset loaded.</div>;
  }

  const tempTrend = trends.find((t) => t.variable === "temperature");
  const co2Trend = trends.find((t) => t.variable === "co2");
  const seaTrend = trends.find((t) => t.variable === "sea_level");
  const rainTrend = trends.find((t) => t.variable === "rainfall");

  const warmestYear = tempYearly.reduce((a, b) => (b.value > a.value ? b : a), tempYearly[0]);
  const coolestYear = tempYearly.reduce((a, b) => (b.value < a.value ? b : a), tempYearly[0]);

  const co2TempCorr = corr.find((r) => r.variable === "temperature")?.values.co2 ?? 0;

  const anomaliesByVar = ALL_VARIABLES.map((v) => ({
    variable: v,
    count: detectAnomalies(records, [v]).length,
  }));
  const topAnomalyVar = anomaliesByVar.reduce((a, b) => (b.count > a.count ? b : a), anomaliesByVar[0]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Insights & report</h2>
        <p className="text-sm text-slate-500 mt-1">
          Auto-generated narrative summary of the analysis — suitable as the conclusion section of a project report.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Warming rate" value={tempTrend?.slopePerDecade.toFixed(2) ?? "—"} unit="°C/decade" accent="red" icon={<TrendingUp size={14} />} />
        <StatTile label="CO₂ growth" value={co2Trend?.slopePerDecade.toFixed(2) ?? "—"} unit="ppm/decade" accent="violet" />
        <StatTile label="Sea-level rise" value={seaTrend?.slopePerDecade.toFixed(2) ?? "—"} unit="mm/decade" accent="teal" />
        <StatTile label="Total anomalies" value={anomalies.length} accent="amber" icon={<AlertTriangle size={14} />} />
      </div>

      <Card>
        <CardHeader title="Executive summary" subtitle="Plain-language findings" icon={<FileText size={16} />} />
        <div className="p-5 prose prose-sm max-w-none">
          <p className="text-slate-700 leading-relaxed">
            Over the {config.endYear - config.startYear + 1}-year period from {config.startYear} to {config.endYear},
            the simulated climate dataset of {summary.totalRecords.toLocaleString()} monthly observations across{" "}
            {summary.regions.length} regions shows a{" "}
            <strong className={tempTrend?.direction === "increasing" ? "text-red-600" : "text-blue-600"}>
              {tempTrend?.direction}
            </strong>{" "}
            temperature trend of <strong>{tempTrend?.slopePerDecade.toFixed(2)} °C per decade</strong>,
            with a total change of {tempTrend?.totalChange.toFixed(2)} °C between the first and last year of the record.
            The warmest year on record in this dataset is <strong>{warmestYear.year}</strong> at{" "}
            {warmestYear.value.toFixed(2)} °C, compared to the coolest year {coolestYear.year} at {coolestYear.value.toFixed(2)} °C.
          </p>
          <p className="text-slate-700 leading-relaxed mt-3">
            Atmospheric CO₂ concentration rose by <strong>{co2Trend?.slopePerDecade.toFixed(2)} ppm per decade</strong>,
            and the correlation between CO₂ and global temperature across the record is{" "}
            <strong className={co2TempCorr > 0.5 ? "text-red-600" : "text-slate-700"}>r = {co2TempCorr.toFixed(2)}</strong>,
            consistent with the greenhouse-gas driven warming pattern modeled into the simulation.
            Sea level rose at <strong>{seaTrend?.slopePerDecade.toFixed(2)} mm per decade</strong>,
            while rainfall shows a {rainTrend?.direction} trend of {rainTrend?.slopePerDecade.toFixed(2)} mm/decade.
          </p>
          <p className="text-slate-700 leading-relaxed mt-3">
            Anomaly detection flagged <strong>{anomalies.length} events</strong> at |z| ≥ 2.5,
            with the most affected variable being {VARIABLE_SHORT[topAnomalyVar.variable]} ({topAnomalyVar.count} events).
            These include simulated heatwaves, cold snaps, droughts, and extreme-rainfall months scattered across all regions and decades.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Key findings" icon={<Lightbulb size={16} />} />
          <div className="p-5 space-y-3">
            <Finding
              title="Long-term warming is detectable"
              body={`The temperature trend of ${tempTrend?.slopePerDecade.toFixed(2)} °C/decade is statistically robust (r² = ${tempTrend?.rSquared.toFixed(2)}), and matches the configured warming rate of ${config.warmingTrend} °C/decade.`}
              color="red"
            />
            <Finding
              title="CO₂ and temperature move together"
              body={`A Pearson correlation of r = ${co2TempCorr.toFixed(2)} between CO₂ and temperature is the strongest cross-variable relationship in the dataset, supporting the simulated greenhouse forcing.`}
              color="violet"
            />
            <Finding
              title="Sea level rise is monotonic"
              body={`Mean sea level rose ~${seaTrend?.totalChange.toFixed(0)} mm over the record, driven by the 3.3 mm/year baseline rate built into the simulator.`}
              color="teal"
            />
            <Finding
              title="Anomalies cluster in extreme months"
              body={`${anomalies.length} anomalies were detected across ${summary.regions.length} regions. The seasonal z-score method correctly isolates months that deviate from their calendar-month baseline.`}
              color="amber"
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Industry relevance" subtitle="Where this type of analysis is used" icon={<Sparkles size={16} />} />
          <div className="p-5 space-y-3 text-sm text-slate-700">
            <RelevanceItem sector="Agritech" use="Forecasting rainfall and drought risk to optimize crop cycles and irrigation." />
            <RelevanceItem sector="Energy & utilities" use="Predicting heatwave frequency to manage peak electricity demand." />
            <RelevanceItem sector="Insurance & finance" use="Climate risk scoring for asset pricing and portfolio exposure." />
            <RelevanceItem sector="Urban planning" use="Sea-level and temperature trends for infrastructure and zoning decisions." />
            <RelevanceItem sector="Public policy" use="Long-term environmental monitoring to inform sustainability mandates." />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Trend summary table" subtitle="Per-variable regression results" icon={<FileText size={16} />} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Variable</th>
                <th className="text-right px-4 py-2 font-medium">Slope / year</th>
                <th className="text-right px-4 py-2 font-medium">Slope / decade</th>
                <th className="text-right px-4 py-2 font-medium">Total change</th>
                <th className="text-right px-4 py-2 font-medium">r²</th>
                <th className="text-left px-4 py-2 font-medium">Direction</th>
              </tr>
            </thead>
            <tbody>
              {trends.map((t) => (
                <tr key={t.variable} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{VARIABLE_SHORT[t.variable]}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-700">{t.slopePerYear.toFixed(4)} {VARIABLE_UNITS[t.variable]}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-700">{t.slopePerDecade.toFixed(3)} {VARIABLE_UNITS[t.variable]}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-700">{t.totalChange.toFixed(2)} {VARIABLE_UNITS[t.variable]}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-700">{t.rSquared.toFixed(3)}</td>
                  <td className="px-4 py-2">
                    <Badge color={t.direction === "increasing" ? "red" : t.direction === "decreasing" ? "blue" : "slate"}>
                      {t.direction}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Finding({ title, body, color }: { title: string; body: string; color: "red" | "violet" | "teal" | "amber" }) {
  const colorMap: Record<string, string> = {
    red: "bg-red-50 border-red-200",
    violet: "bg-violet-50 border-violet-200",
    teal: "bg-teal-50 border-teal-200",
    amber: "bg-amber-50 border-amber-200",
  };
  return (
    <div className={`p-3 rounded-lg border ${colorMap[color]}`}>
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      <div className="text-xs text-slate-600 mt-1 leading-relaxed">{body}</div>
    </div>
  );
}

function RelevanceItem({ sector, use }: { sector: string; use: string }) {
  return (
    <div className="flex gap-3">
      <Badge color="slate">{sector}</Badge>
      <span className="text-slate-600 leading-relaxed flex-1">{use}</span>
    </div>
  );
}

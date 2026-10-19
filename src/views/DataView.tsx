import { useState } from "react";
import { Database, RefreshCw, Save, Table2, Trash2 } from "lucide-react";
import { useApp } from "@/lib/appContext";
import {
  DEFAULT_REGIONS,
  generateDataset,
  summarizeDataset,
  type ClimateRecord,
  type DatasetConfig,
} from "@/lib/climate";
import { supabase } from "@/lib/supabase";
import { Button, Card, CardHeader, Badge } from "@/components/ui";

export function DataView() {
  const { config, records, setDataset } = useApp();
  const [form, setForm] = useState<DatasetConfig>(
    config ?? {
      startYear: 1980,
      endYear: 2023,
      regions: DEFAULT_REGIONS,
      warmingTrend: 0.35,
      anomalyRate: 0.04,
      seed: 42,
    }
  );
  const [preview, setPreview] = useState<ClimateRecord[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savedName, setSavedName] = useState("");
  const [savedList, setSavedList] = useState<{ id: string; name: string; created_at: string }[]>([]);

  const toggleRegion = (r: string) => {
    setForm((f) => ({
      ...f,
      regions: f.regions.includes(r)
        ? f.regions.filter((x) => x !== r)
        : [...f.regions, r],
    }));
  };

  const handleGenerate = () => {
    setBusy(true);
    setMessage(null);
    setTimeout(() => {
      const recs = generateDataset(form);
      setPreview(recs);
      setDataset(recs, form);
      setBusy(false);
      setMessage(`Generated ${recs.length.toLocaleString()} records across ${form.regions.length} regions.`);
    }, 120);
  };

  const handleSave = async () => {
    if (!records.length || !config) return;
    const name = savedName.trim() || `Dataset ${new Date().toLocaleString()}`;
    setBusy(true);
    const { error } = await supabase.from("saved_datasets").insert({
      name,
      config,
      summary: summarizeDataset(records),
      records,
    });
    setBusy(false);
    if (error) {
      setMessage(`Save failed: ${error.message}`);
    } else {
      setMessage(`Saved "${name}" to database.`);
      setSavedName("");
      void loadSaved();
    }
  };

  const loadSaved = async () => {
    const { data, error } = await supabase
      .from("saved_datasets")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });
    if (!error && data) setSavedList(data as typeof savedList);
  };

  const handleLoad = async (id: string) => {
    setBusy(true);
    const { data, error } = await supabase
      .from("saved_datasets")
      .select("id, name, config, summary, records")
      .eq("id", id)
      .maybeSingle();
    setBusy(false);
    if (error || !data) {
      setMessage(`Load failed: ${error?.message ?? "not found"}`);
      return;
    }
    setDataset(data.records as ClimateRecord[], data.config as DatasetConfig);
    setPreview(data.records as ClimateRecord[]);
    setMessage(`Loaded "${data.name}".`);
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    await supabase.from("saved_datasets").delete().eq("id", id);
    setBusy(false);
    void loadSaved();
  };

  void loadSaved;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Data generation</h2>
        <p className="text-sm text-slate-500 mt-1">
          Configure the synthetic climate dataset. The simulator models seasonal cycles, long-term warming, CO₂ growth, sea-level rise, and random extreme events.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Simulation parameters" icon={<Database size={16} />} />
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start year">
                <input
                  type="number"
                  value={form.startYear}
                  onChange={(e) => setForm({ ...form, startYear: Number(e.target.value) })}
                  className="input"
                />
              </Field>
              <Field label="End year">
                <input
                  type="number"
                  value={form.endYear}
                  onChange={(e) => setForm({ ...form, endYear: Number(e.target.value) })}
                  className="input"
                />
              </Field>
              <Field label="Warming trend (°C/decade)">
                <input
                  type="number"
                  step="0.05"
                  value={form.warmingTrend}
                  onChange={(e) => setForm({ ...form, warmingTrend: Number(e.target.value) })}
                  className="input"
                />
              </Field>
              <Field label="Anomaly rate (%)">
                <input
                  type="number"
                  step="0.5"
                  value={(form.anomalyRate * 100).toFixed(1)}
                  onChange={(e) => setForm({ ...form, anomalyRate: Number(e.target.value) / 100 })}
                  className="input"
                />
              </Field>
              <Field label="Random seed">
                <input
                  type="number"
                  value={form.seed}
                  onChange={(e) => setForm({ ...form, seed: Number(e.target.value) })}
                  className="input"
                />
              </Field>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">Regions</label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_REGIONS.map((r) => {
                  const on = form.regions.includes(r);
                  return (
                    <button
                      key={r}
                      onClick={() => toggleRegion(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        on
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button onClick={handleGenerate} disabled={busy || form.regions.length === 0}>
                <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
                Generate dataset
              </Button>
              <span className="text-xs text-slate-400">
                ≈ {((form.endYear - form.startYear + 1) * 12 * form.regions.length).toLocaleString()} records
              </span>
            </div>
            {message && <p className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-md">{message}</p>}
          </div>
        </Card>

        <Card>
          <CardHeader title="Save & load datasets" subtitle="Persist datasets to the Supabase database" icon={<Save size={16} />} />
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Dataset name (optional)"
                value={savedName}
                onChange={(e) => setSavedName(e.target.value)}
                className="input flex-1"
              />
              <Button onClick={handleSave} disabled={busy || !records.length} variant="secondary">
                <Save size={14} /> Save
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Saved datasets</span>
              <Button onClick={() => void loadSaved()} variant="ghost" size="sm">Refresh</Button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {savedList.length === 0 && (
                <p className="text-xs text-slate-400 italic">No saved datasets yet. Click Refresh to load any from the database.</p>
              )}
              {savedList.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{d.name}</div>
                    <div className="text-[11px] text-slate-400">{new Date(d.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button onClick={() => void handleLoad(d.id)} variant="ghost" size="sm">Load</Button>
                    <Button onClick={() => void handleDelete(d.id)} variant="danger" size="sm">
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {preview && preview.length > 0 && (
        <Card>
          <CardHeader
            title="Data preview"
            subtitle={`${preview.length.toLocaleString()} records · first 12 rows`}
            icon={<Table2 size={16} />}
            right={<Badge color="slate">{preview[0].region}</Badge>}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <Th>Date</Th>
                  <Th>Region</Th>
                  <Th>Temp (°C)</Th>
                  <Th>Rain (mm)</Th>
                  <Th>Humidity (%)</Th>
                  <Th>CO₂ (ppm)</Th>
                  <Th>Sea (mm)</Th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 12).map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <Td>{r.date}</Td>
                    <Td>{r.region}</Td>
                    <Td mono>{r.temperature.toFixed(2)}</Td>
                    <Td mono>{r.rainfall.toFixed(1)}</Td>
                    <Td mono>{r.humidity.toFixed(1)}</Td>
                    <Td mono>{r.co2.toFixed(2)}</Td>
                    <Td mono>{r.sea_level.toFixed(2)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <style>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.625rem;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.5rem;
          font-size: 0.875rem;
          background: white;
          color: rgb(15 23 42);
        }
        .input:focus {
          outline: none;
          border-color: rgb(15 23 42);
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-2 font-medium">{children}</th>;
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <td className={`px-4 py-2 ${mono ? "tabular-nums text-slate-700" : "text-slate-700"}`}>{children}</td>;
}

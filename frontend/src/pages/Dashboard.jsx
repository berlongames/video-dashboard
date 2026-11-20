import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Scissors, CalendarClock, Eye, ThumbsUp, Sparkles, Save } from "lucide-react";

const AI_KEY = "vd_ai_connector";

function loadAiConfig() {
  try {
    return JSON.parse(localStorage.getItem(AI_KEY) || "{}");
  } catch {
    return {};
  }
}

function Card({ title, value, icon: Icon, sub }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-400">{title}</span>
        <Icon size={18} className="text-brand-500" />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    pending: "bg-slate-700 text-slate-300",
    processing: "bg-amber-900/60 text-amber-300",
    completed: "bg-emerald-900/60 text-emerald-300",
    uploaded: "bg-emerald-900/60 text-emerald-300",
    scheduled: "bg-sky-900/60 text-sky-300",
    uploading: "bg-sky-900/60 text-sky-300",
    failed: "bg-red-900/60 text-red-300",
    cancelled: "bg-slate-700 text-slate-400",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [summary, setSummary] = useState(null);

  const saved = loadAiConfig();
  const [provider, setProvider] = useState(saved.provider || "openai");
  const [apiKey, setApiKey] = useState(saved.apiKey || "");
  const [baseUrl, setBaseUrl] = useState(saved.baseUrl || "");
  const [model, setModel] = useState(saved.model || "");
  const [aiMsg, setAiMsg] = useState("");
  const [aiSaving, setAiSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.listJobs(), api.listSchedules(), api.statsSummary()])
      .then(([j, s, sum]) => {
        setJobs(j);
        setSchedules(s);
        setSummary(sum);
      })
      .catch(console.error);
  }, []);

  async function saveAiConnector(e) {
    e.preventDefault();
    setAiSaving(true);
    setAiMsg("");
    const cfg = {
      provider,
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim(),
      model: model.trim(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(AI_KEY, JSON.stringify(cfg));
    try {
      if (api.saveAiConnector) {
        await api.saveAiConnector({
          provider: cfg.provider,
          baseUrl: cfg.baseUrl,
          model: cfg.model,
          hasKey: !!cfg.apiKey,
          apiKeyHint: cfg.apiKey ? `…${cfg.apiKey.slice(-4)}` : "",
        });
      }
      setAiMsg("AI connector saved.");
    } catch (err) {
      setAiMsg("Saved locally. Server sync skipped.");
    } finally {
      setAiSaving(false);
    }
  }

  const processing = jobs.filter((j) => j.status === "processing").length;
  const pendingUpload = schedules.filter(
    (s) => s.status === "pending" || s.status === "scheduled"
  ).length;
  const aiConnected = !!(saved.apiKey || apiKey);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card title="Active clip jobs" value={processing} icon={Scissors} sub={`${jobs.length} total`} />
        <Card title="Waiting upload" value={pendingUpload} icon={CalendarClock} />
        <Card title="Total views" value={summary?.total_views?.toLocaleString() ?? "—"} icon={Eye} />
        <Card title="Total likes" value={summary?.total_likes?.toLocaleString() ?? "—"} icon={ThumbsUp} />
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-brand-500" />
          <h3 className="font-semibold">AI connector</h3>
          <span
            className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
              aiConnected ? "bg-emerald-900/50 text-emerald-300" : "bg-slate-800 text-slate-400"
            }`}
          >
            {aiConnected ? "configured" : "not set"}
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Used for AI-assisted clip selection / titles when the backend is connected. Stored in this browser (demo).
        </p>
        <form onSubmit={saveAiConnector} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="openai">OpenAI</option>
              <option value="xai">xAI (Grok)</option>
              <option value="anthropic">Anthropic</option>
              <option value="custom">Custom OpenAI-compatible</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400">Model (optional)</label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={
                provider === "xai"
                  ? "grok-3"
                  : provider === "anthropic"
                    ? "claude-sonnet-4"
                    : "gpt-4o-mini"
              }
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-400">API key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-… or xai-…"
              autoComplete="off"
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-400">Base URL (optional)</label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={
                provider === "xai"
                  ? "https://api.x.ai/v1"
                  : provider === "openai"
                    ? "https://api.openai.com/v1"
                    : "https://api.example.com/v1"
              }
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={aiSaving}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              <Save size={14} />
              {aiSaving ? "Saving…" : "Save AI connector"}
            </button>
            {aiMsg && <span className="text-xs text-emerald-400">{aiMsg}</span>}
          </div>
        </form>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent jobs</h3>
            <Link to="/jobs" className="text-sm text-brand-500 hover:underline">View all</Link>
          </div>
          <ul className="space-y-2">
            {jobs.slice(0, 5).map((j) => (
              <li key={j.id} className="flex items-center justify-between text-sm py-2 border-b border-slate-800 last:border-0">
                <span className="truncate max-w-[60%]">{j.title}</span>
                <StatusBadge status={j.status} />
              </li>
            ))}
            {jobs.length === 0 && <li className="text-slate-500 text-sm">No jobs yet</li>}
          </ul>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Upload queue</h3>
            <Link to="/schedules" className="text-sm text-brand-500 hover:underline">View all</Link>
          </div>
          <ul className="space-y-2">
            {schedules.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm py-2 border-b border-slate-800 last:border-0">
                <span className="truncate max-w-[60%]">{s.title}</span>
                <StatusBadge status={s.status} />
              </li>
            ))}
            {schedules.length === 0 && <li className="text-slate-500 text-sm">No schedules yet</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

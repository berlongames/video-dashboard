import { useEffect, useState, useRef } from "react";
import { api } from "../lib/api";
import { Upload, RefreshCw, Trash2, Layers } from "lucide-react";

function StatusBadge({ status }) {
  const colors = {
    pending: "bg-slate-700 text-slate-300",
    processing: "bg-amber-900/60 text-amber-300",
    completed: "bg-emerald-900/60 text-emerald-300",
    failed: "bg-red-900/60 text-red-300",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
}

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formOk, setFormOk] = useState("");
  const fileRef = useRef();

  const load = () => {
    setLoading(true);
    api.listJobs().then(setJobs).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    setFormOk("");
    const form = e.target;
    const fd = new FormData(form);
    const files = fileRef.current?.files || [];
    const sourceUrls = (fd.get("source_urls") || "").toString().trim();

    if (!files.length && !sourceUrls) {
      setFormError("Select at least one video file or enter a source URL.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: (fd.get("title") || "").toString(),
        job_type: (fd.get("job_type") || "single").toString(),
        target_duration: Number(fd.get("target_duration")) || 600,
        platform: (fd.get("platform") || "youtube_long").toString(),
        source_urls: sourceUrls,
        source_names: Array.from(files).map((f) => f.name),
      };
      await api.createJobJson(payload);
      setFormOk(
        files.length
          ? `Job created (${files.length} file name(s)). Video bytes are NOT uploaded on Vercel — AutoClip needs a VPS.`
          : "Job created from URL(s). Real processing needs a VPS backend."
      );
      setShowForm(false);
      form.reset();
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (err) {
      setFormError(String(err?.message || err || "Failed to create job"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Clip Jobs</h2>
        <button
          onClick={() => { setShowForm((v) => !v); setFormError(""); setFormOk(""); }}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          <Upload size={16} /> New job
        </button>
      </div>

      {formOk && (
        <div className="mb-4 text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-3 py-2 rounded-lg">
          {formOk}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 space-y-4">
          {formError && (
            <div className="text-sm text-red-400 bg-red-950/40 px-3 py-2 rounded-lg">{formError}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400">Title</label>
              <input name="title" className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Optional title" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Job type</label>
              <select name="job_type" className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                <option value="single">Single video → short</option>
                <option value="compilation">Compilation (multi)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Target duration (seconds)</label>
              <input name="target_duration" type="number" defaultValue={600} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400">Platform preset</label>
              <select name="platform" className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                <option value="youtube_long">YouTube (longer form)</option>
                <option value="youtube_shorts">YouTube Shorts</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400">Source URLs (comma-separated, optional)</label>
            <input name="source_urls" className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="https://youtube.com/..." />
          </div>
          <div>
            <label className="text-xs text-slate-400">Upload video files</label>
            <input ref={fileRef} type="file" accept="video/*" multiple className="w-full mt-1 text-sm text-slate-400" />
            <p className="text-xs text-slate-500 mt-1">
              Demo mode: only file <strong>names</strong> are sent. Real AutoClip runs on a VPS with Docker.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg">
              {submitting ? "Starting…" : "Start clipping"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-400 px-3 py-2">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60 text-slate-400 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Progress</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                <td className="px-4 py-3 text-slate-500">#{j.id}</td>
                <td className="px-4 py-3 max-w-[200px] truncate">{j.title}</td>
                <td className="px-4 py-3">
                  {j.job_type === "compilation" ? (
                    <span className="inline-flex items-center gap-1 text-xs text-violet-300"><Layers size={12} /> multi</span>
                  ) : "single"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={j.status} />
                  {j.stage && j.status === "processing" && (
                    <span className="ml-2 text-xs text-slate-500">{j.stage}</span>
                  )}
                </td>
                <td className="px-4 py-3 w-32">
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${(j.progress || 0) * 100}%` }} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {j.status === "failed" && (
                      <button onClick={() => api.retryJob(j.id).then(load)} className="text-slate-400 hover:text-white" title="Retry">
                        <RefreshCw size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm("Delete this job?")) api.deleteJob(j.id).then(load).catch(() => setJobs((x) => x.filter((y) => y.id !== j.id))); }}
                      className="text-slate-400 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && jobs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No clip jobs yet. Create one to get started.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

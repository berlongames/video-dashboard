import { useEffect, useState, useRef } from "react";
import { api } from "../lib/api";
import { Upload, RefreshCw, Trash2, Layers, Play, Download, X, Sparkles } from "lucide-react";

const DEMO_PREVIEW = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const DEFAULT_UPLOADER = {
  title: "", channel_site: "", model: "", tags: "", categories: "", sponsored: false,
  video_type: "free", publish_when: "now", privacy: "public", orientation: "straight",
  language: "English", join_now_url: "", description: "",
};

function StatusBadge({ status }) {
  const colors = {
    pending: "bg-slate-700 text-slate-300", processing: "bg-amber-900/60 text-amber-300",
    completed: "bg-emerald-900/60 text-emerald-300", failed: "bg-red-900/60 text-red-300",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || colors.pending}`}>{status}</span>;
}

function mediaUrl(job) {
  if (job.output_url) return job.output_url;
  if (job.preview_url) return job.preview_url;
  if (job.output_path) {
    const name = String(job.output_path).split(/[/\\]/).pop();
    return `/media/outputs/${encodeURIComponent(name)}`;
  }
  if (job.status === "completed") return DEMO_PREVIEW;
  return null;
}

function PreviewModal({ job, onClose }) {
  const url = mediaUrl(job);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h3 className="font-semibold text-white text-sm">{job.title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1"><X size={18} /></button>
        </div>
        <div className="bg-black aspect-video flex items-center justify-center">
          {url ? <video src={url} controls autoPlay className="w-full h-full max-h-[70vh]" /> : <p className="text-slate-500 text-sm p-8">No output file yet.</p>}
        </div>
        <div className="px-4 py-3 flex justify-end gap-2 border-t border-slate-800">
          {url && <a href={url} download target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg"><Download size={14} /> Download</a>}
          <button onClick={onClose} className="text-sm text-slate-400 px-3 py-2">Close</button>
        </div>
      </div>
    </div>
  );
}

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formOk, setFormOk] = useState("");
  const [previewJob, setPreviewJob] = useState(null);
  const [platform, setPlatform] = useState("ph");
  const [filesSelected, setFilesSelected] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState("");
  const [uploader, setUploader] = useState(DEFAULT_UPLOADER);
  const fileRef = useRef();
  const showUploader = filesSelected || platform === "ph";

  const load = () => {
    setLoading(true);
    api.listJobs().then(setJobs).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  function setUp(key, value) {
    setUploader((u) => ({ ...u, [key]: value }));
  }

  async function runAiScan(fileList) {
    const names = Array.from(fileList || []).map((f) => f.name);
    if (!names.length) return;
    setScanning(true);
    setScanNote("AI scanning video…");
    try {
      let title = "", tags = "";
      try {
        const res = await api.scanTitle({ source_names: names, platform });
        title = res?.title || "";
        tags = res?.tags || "";
        setScanNote(res?.note || "Title suggested from video scan.");
      } catch {
        title = names[0].replace(/\.[^/.]+$/, "").replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();
        title = title.split(" ").map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
        setScanNote("Title from filename (scanner offline).");
      }
      setUploader((u) => ({ ...u, title: title || u.title, tags: tags || u.tags }));
    } finally {
      setScanning(false);
    }
  }

  function onFilesChange(e) {
    const files = e.target.files;
    const has = !!(files && files.length);
    setFilesSelected(has);
    if (has) runAiScan(files);
    else setScanNote("");
  }

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
      await api.createJobJson({
        title: uploader.title || "",
        job_type: (fd.get("job_type") || "single").toString(),
        target_duration: Number(fd.get("target_duration")) || 600,
        platform,
        source_urls: sourceUrls,
        source_names: Array.from(files).map((f) => f.name),
        uploader: { ...uploader },
      });
      setFormOk("Job created. Uploader details saved with the job.");
      setShowForm(false);
      form.reset();
      if (fileRef.current) fileRef.current.value = "";
      setFilesSelected(false);
      setUploader(DEFAULT_UPLOADER);
      setScanNote("");
      setPlatform("ph");
      load();
    } catch (err) {
      setFormError(String(err?.message || err || "Failed to create job"));
    } finally {
      setSubmitting(false);
    }
  }

  function downloadJob(job) {
    const url = mediaUrl(job);
    if (!url) return alert("No output file available yet.");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(job.title || "clip").replace(/\s+/g, "_")}.mp4`;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Clip Jobs</h2>
        <button onClick={() => { setShowForm((v) => !v); setFormError(""); setFormOk(""); }} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          <Upload size={16} /> New job
        </button>
      </div>

      {formOk && <div className="mb-4 text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-3 py-2 rounded-lg">{formOk}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 space-y-4">
          {formError && <div className="text-sm text-red-400 bg-red-950/40 px-3 py-2 rounded-lg">{formError}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400">Platform preset</label>
              <select name="platform" value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                <option value="ph">PH (tube uploader fields)</option>
                <option value="youtube_long">YouTube (longer form)</option>
                <option value="youtube_shorts">YouTube Shorts</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400">Source URLs (optional)</label>
            <input name="source_urls" className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="https://youtube.com/..." />
          </div>

          <div>
            <label className="text-xs text-slate-400">Upload video files</label>
            <input ref={fileRef} type="file" accept="video/*" multiple onChange={onFilesChange} className="w-full mt-1 text-sm text-slate-400" />
            {scanning && <p className="text-xs text-amber-400 mt-2 flex items-center gap-1"><Sparkles size={12} /> AI scanning video for title…</p>}
            {!scanning && scanNote && <p className="text-xs text-slate-500 mt-2">{scanNote}</p>}
          </div>

          {showUploader && (
            <div className="border border-slate-700 rounded-xl p-4 space-y-4 bg-slate-950/50">
              <h3 className="text-xs font-semibold tracking-wide text-amber-500 border-b-2 border-amber-500 inline-block pb-1">
                VIDEO DETAILS {platform === "ph" ? "· PH PRESET" : ""}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400">Title {scanning ? "(scanning…)" : "(AI filled)"}</label>
                  <input value={uploader.title} onChange={(e) => setUp("title", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Auto from video scan" />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Channel site</label>
                  <input value={uploader.channel_site} onChange={(e) => setUp("channel_site", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Model</label>
                  <input value={uploader.model} onChange={(e) => setUp("model", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400">Tags</label>
                  <input value={uploader.tags} onChange={(e) => setUp("tags", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="comma,separated" />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Categories</label>
                  <input value={uploader.categories} onChange={(e) => setUp("categories", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-2">Sponsored?</label>
                  <div className="flex gap-2">
                    {[{ v: true, label: "Yes" }, { v: false, label: "No" }].map((o) => (
                      <button key={String(o.v)} type="button" onClick={() => setUp("sponsored", o.v)} className={`px-3 py-1.5 rounded-lg text-sm border ${uploader.sponsored === o.v ? "bg-brand-600 border-brand-500 text-white" : "bg-slate-800 border-slate-700 text-slate-300"}`}>{o.label}</button>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400 block mb-2">Video type?</label>
                  <div className="flex flex-wrap gap-2">
                    {[{ v: "adshare", label: "Adshare" }, { v: "viewshare", label: "Viewshare" }, { v: "free", label: "Free" }].map((o) => (
                      <button key={o.v} type="button" onClick={() => setUp("video_type", o.v)} className={`px-3 py-1.5 rounded-lg text-sm border ${uploader.video_type === o.v ? "bg-brand-600 border-brand-500 text-white" : "bg-slate-800 border-slate-700 text-slate-300"}`}>{o.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Publish when?</label>
                  <select value={uploader.publish_when} onChange={(e) => setUp("publish_when", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                    <option value="now">Publish Now</option>
                    <option value="schedule">Schedule</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Visibility</label>
                  <select value={uploader.privacy} onChange={(e) => setUp("privacy", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Orientation</label>
                  <select value={uploader.orientation} onChange={(e) => setUp("orientation", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                    <option value="straight">Straight</option>
                    <option value="gay">Gay</option>
                    <option value="lesbian">Lesbian</option>
                    <option value="bisexual">Bisexual</option>
                    <option value="trans">Trans</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Language</label>
                  <select value={uploader.language} onChange={(e) => setUp("language", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400">Join Now Website</label>
                  <input value={uploader.join_now_url} onChange={(e) => setUp("join_now_url", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="https://www.website.com" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-400">Description</label>
                  <textarea value={uploader.description} onChange={(e) => setUp("description", e.target.value)} rows={2} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={submitting || scanning} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg">
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
                <td className="px-4 py-3">{j.job_type === "compilation" ? <span className="inline-flex items-center gap-1 text-xs text-violet-300"><Layers size={12} /> multi</span> : "single"}</td>
                <td className="px-4 py-3"><StatusBadge status={j.status} /></td>
                <td className="px-4 py-3 w-32">
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${(j.progress || 0) * 100}%` }} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {j.status === "completed" && (
                      <>
                        <button onClick={() => setPreviewJob(j)} className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 border border-brand-800/60 rounded-md px-2 py-1"><Play size={13} /> Preview</button>
                        <button onClick={() => downloadJob(j)} className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white border border-slate-700 rounded-md px-2 py-1"><Download size={13} /> Download</button>
                      </>
                    )}
                    {j.status === "failed" && <button onClick={() => api.retryJob(j.id).then(load)} className="text-slate-400 hover:text-white"><RefreshCw size={15} /></button>}
                    <button onClick={() => { if (confirm("Delete?")) api.deleteJob(j.id).then(load).catch(() => setJobs((x) => x.filter((y) => y.id !== j.id))); }} className="text-slate-400 hover:text-red-400"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && jobs.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No clip jobs yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {previewJob && <PreviewModal job={previewJob} onClose={() => setPreviewJob(null)} />}
    </div>
  );
}

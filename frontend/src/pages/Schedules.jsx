import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Upload, ExternalLink, ChevronDown, ChevronUp, Save } from "lucide-react";

const EMPTY_META = {
  title: "",
  channel_site: "",
  model: "",
  tags: "",
  categories: "",
  sponsored: false,
  video_type: "free",
  publish_when: "now",
  scheduled_at: "",
  privacy: "public",
  orientation: "straight",
  language: "English",
  join_now_url: "",
  description: "",
};

function StatusBadge({ status }) {
  const colors = {
    pending: "bg-slate-700 text-slate-300",
    scheduled: "bg-sky-900/60 text-sky-300",
    uploading: "bg-amber-900/60 text-amber-300",
    uploaded: "bg-emerald-900/60 text-emerald-300",
    failed: "bg-red-900/60 text-red-300",
    cancelled: "bg-slate-700 text-slate-400",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
}

function fieldFromItem(item) {
  return {
    title: item.title || "",
    channel_site: item.channel_site || "",
    model: item.model || "",
    tags: item.tags || "",
    categories: item.categories || "",
    sponsored: !!item.sponsored,
    video_type: item.video_type || "free",
    publish_when: item.publish_when || (item.scheduled_at ? "schedule" : "now"),
    scheduled_at: item.scheduled_at
      ? new Date(item.scheduled_at).toISOString().slice(0, 16)
      : "",
    privacy: item.privacy || "public",
    orientation: item.orientation || "straight",
    language: item.language || "English",
    join_now_url: item.join_now_url || "",
    description: item.description || "",
  };
}

export default function Schedules() {
  const [items, setItems] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState(EMPTY_META);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => api.listSchedules().then(setItems).catch(console.error);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  function openEditor(item) {
    if (openId === item.id) {
      setOpenId(null);
      return;
    }
    setOpenId(item.id);
    setForm(fieldFromItem(item));
    setMsg("");
  }

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function saveMeta(id) {
    setSaving(true);
    setMsg("");
    try {
      const body = {
        ...form,
        scheduled_at:
          form.publish_when === "schedule" && form.scheduled_at
            ? new Date(form.scheduled_at).toISOString()
            : null,
      };
      await api.updateSchedule(id, body);
      setMsg("Saved.");
      load();
    } catch (e) {
      setMsg(String(e?.message || e || "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Upload Schedule</h2>
      <p className="text-sm text-slate-400 mb-6">
        After a clip finishes, set upload metadata (title, tags, visibility, etc.) then publish or schedule.
      </p>

      <div className="space-y-3">
        {items.map((s) => (
          <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-[140px]">
                <div className="font-medium text-white truncate">{s.title || "Untitled"}</div>
                <div className="text-xs text-slate-500">
                  Job #{s.clip_job_id}
                  {s.video_type ? ` · ${s.video_type}` : ""}
                  {s.sponsored ? " · sponsored" : ""}
                </div>
              </div>
              <StatusBadge status={s.status} />
              <span className="text-xs text-slate-400">
                {s.scheduled_at
                  ? new Date(s.scheduled_at).toLocaleString()
                  : "Publish now"}
              </span>
              {s.youtube_url ? (
                <a href={s.youtube_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-500 hover:underline text-xs">
                  Watch <ExternalLink size={12} />
                </a>
              ) : null}
              <button type="button" onClick={() => openEditor(s)} className="inline-flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg">
                Video details {openId === s.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {s.status !== "uploaded" && s.status !== "uploading" && (
                <button type="button" onClick={() => api.uploadNow(s.id).then(load)} className="inline-flex items-center gap-1 text-xs bg-brand-600 hover:bg-brand-700 text-white px-2.5 py-1.5 rounded-lg">
                  <Upload size={13} /> Upload now
                </button>
              )}
            </div>

            {openId === s.id && (
              <div className="border-t border-slate-800 px-4 py-5 space-y-5">
                <h3 className="text-xs font-semibold tracking-wide text-amber-500 border-b-2 border-amber-500 inline-block pb-1">
                  VIDEO DETAILS
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs text-slate-400">Title</label>
                    <input value={form.title} onChange={(e) => set("title", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Video title" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Channel site</label>
                    <input value={form.channel_site} onChange={(e) => set("channel_site", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Channel name or site" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Model</label>
                    <input value={form.model} onChange={(e) => set("model", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Model name(s)" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-slate-400">Tags</label>
                    <input value={form.tags} onChange={(e) => set("tags", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="comma,separated,tags" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Categories</label>
                    <input value={form.categories} onChange={(e) => set("categories", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Entertainment" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-2">Sponsored content?</label>
                    <div className="flex gap-2">
                      {[{ v: true, label: "Yes" }, { v: false, label: "No" }].map((o) => (
                        <button key={String(o.v)} type="button" onClick={() => set("sponsored", o.v)} className={`px-3 py-1.5 rounded-lg text-sm border ${form.sponsored === o.v ? "bg-brand-600 border-brand-500 text-white" : "bg-slate-800 border-slate-700 text-slate-300"}`}>{o.label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-slate-400 block mb-2">Video type?</label>
                    <div className="flex flex-wrap gap-2">
                      {[{ v: "adshare", label: "Adshare" }, { v: "viewshare", label: "Viewshare" }, { v: "free", label: "Free" }].map((o) => (
                        <button key={o.v} type="button" onClick={() => set("video_type", o.v)} className={`px-3 py-1.5 rounded-lg text-sm border ${form.video_type === o.v ? "bg-brand-600 border-brand-500 text-white" : "bg-slate-800 border-slate-700 text-slate-300"}`}>{o.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">When will this be published?</label>
                    <select value={form.publish_when} onChange={(e) => set("publish_when", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                      <option value="now">Publish Now</option>
                      <option value="schedule">Schedule</option>
                    </select>
                  </div>
                  {form.publish_when === "schedule" && (
                    <div>
                      <label className="text-xs text-slate-400">Schedule date & time</label>
                      <input type="datetime-local" value={form.scheduled_at} onChange={(e) => set("scheduled_at", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-slate-400">Video visibility?</label>
                    <select value={form.privacy} onChange={(e) => set("privacy", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                      <option value="public">Public</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Video orientation?</label>
                    <select value={form.orientation} onChange={(e) => set("orientation", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                      <option value="straight">Straight</option>
                      <option value="gay">Gay</option>
                      <option value="lesbian">Lesbian</option>
                      <option value="bisexual">Bisexual</option>
                      <option value="trans">Trans</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Language spoken in video?</label>
                    <select value={form.language} onChange={(e) => set("language", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                      <option value="Portuguese">Portuguese</option>
                      <option value="Italian">Italian</option>
                      <option value="Russian">Russian</option>
                      <option value="Japanese">Japanese</option>
                      <option value="Korean">Korean</option>
                      <option value="Chinese">Chinese</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-slate-400">Join Now Website</label>
                    <input value={form.join_now_url} onChange={(e) => set("join_now_url", e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="https://www.website.com" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-slate-400">Description</label>
                    <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Video description" />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button type="button" disabled={saving} onClick={() => saveMeta(s.id)} className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg">
                    <Save size={14} />
                    {saving ? "Saving…" : "Save details"}
                  </button>
                  {msg && <span className={`text-xs ${msg === "Saved." ? "text-emerald-400" : "text-red-400"}`}>{msg}</span>}
                </div>
              </div>
            )}
          </div>
        ))}

        {items.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-10 text-center text-slate-500 text-sm">
            No scheduled uploads yet. Finish a clip job first.
          </div>
        )}
      </div>
    </div>
  );
}

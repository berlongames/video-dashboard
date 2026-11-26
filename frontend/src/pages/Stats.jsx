import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { ExternalLink, Plus, Trash2, RefreshCw } from "lucide-react";

function Metric({ label, value }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}

export default function Stats() {
  const [summary, setSummary] = useState(null);
  const [channels, setChannels] = useState([]);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [activeId, setActiveId] = useState(null);

  const loadSummary = () =>
    api.statsSummary().then(setSummary).catch(console.error);

  const loadChannels = () =>
    api.listStatChannels().then(setChannels).catch(console.error);

  useEffect(() => {
    loadSummary();
    loadChannels();
    const t = setInterval(loadSummary, 60000);
    return () => clearInterval(t);
  }, []);

  async function addChannel(e) {
    e.preventDefault();
    setErr("");
    const u = url.trim();
    if (!u) {
      setErr("Paste a channel URL first.");
      return;
    }
    setLoading(true);
    try {
      const entry = await api.addStatChannel({ url: u });
      setUrl("");
      await loadChannels();
      setActiveId(entry.id);
    } catch (ex) {
      setErr(String(ex?.message || ex || "Failed to add channel"));
    } finally {
      setLoading(false);
    }
  }

  async function removeChannel(id) {
    if (!confirm("Remove this channel from statistics?")) return;
    try {
      await api.deleteStatChannel(id);
      if (activeId === id) setActiveId(null);
      loadChannels();
    } catch (ex) {
      setErr(String(ex?.message || ex));
    }
  }

  async function refreshChannel(c) {
    setLoading(true);
    setErr("");
    try {
      await api.deleteStatChannel(c.id);
      const entry = await api.addStatChannel({ url: c.url });
      setActiveId(entry.id);
      await loadChannels();
    } catch (ex) {
      setErr(String(ex?.message || ex));
    } finally {
      setLoading(false);
    }
  }

  const active = channels.find((c) => c.id === activeId) || channels[0] || null;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Statistics</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Metric label="Uploads" value={summary?.total_uploads ?? "—"} />
        <Metric
          label="Views"
          value={summary?.total_views != null ? summary.total_views.toLocaleString() : "—"}
        />
        <Metric
          label="Likes"
          value={summary?.total_likes != null ? summary.total_likes.toLocaleString() : "—"}
        />
        <Metric
          label="Comments"
          value={
            summary?.total_comments != null
              ? summary.total_comments.toLocaleString()
              : "—"
          }
        />
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8">
        <h3 className="font-semibold mb-1">Channel tracker</h3>
        <p className="text-xs text-slate-500 mb-4">
          Paste a channel URL. Videos from underThumb-info (after contentTitle). Comment count from cmtHeader;
          hover Comments for last commentText body.
        </p>

        <form onSubmit={addChannel} className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.pornhub.com/channels/brazzers"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <Plus size={16} />
            {loading ? "Scraping…" : "Add & scrape"}
          </button>
        </form>

        {err && (
          <div className="mb-3 text-sm text-red-400 bg-red-950/40 px-3 py-2 rounded-lg">{err}</div>
        )}

        {channels.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {channels.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={`text-xs px-3 py-1.5 rounded-full border ${
                  active?.id === c.id
                    ? "bg-brand-600 border-brand-500 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-300"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {active && (
          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center gap-3 justify-between">
              <div>
                <div className="font-medium text-white">{active.label}</div>
                <a href={active.url} target="_blank" rel="noreferrer" className="text-xs text-brand-500 hover:underline break-all">
                  {active.url}
                </a>
                {active.note && <p className="text-[11px] text-slate-500 mt-1">{active.note}</p>}
                {active.error && <p className="text-[11px] text-amber-400 mt-1">{active.error}</p>}
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={loading} onClick={() => refreshChannel(active)} className="inline-flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg">
                  <RefreshCw size={12} /> Rescrape
                </button>
                <button type="button" onClick={() => removeChannel(active.id)} className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2.5 py-1.5">
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead className="bg-slate-800/60 text-slate-400 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Views</th>
                  <th className="px-4 py-3 font-medium">Comments</th>
                  <th className="px-4 py-3 font-medium">Last comment</th>
                  <th className="px-4 py-3 font-medium">Link</th>
                </tr>
              </thead>
              <tbody>
                {(active.videos || []).map((v, i) => (
                  <tr key={i} className="border-t border-slate-800 align-top">
                    <td className="px-4 py-3 max-w-[220px]"><span className="line-clamp-2">{v.title}</span></td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-300">{v.views}</td>
                    <td
                      className="px-4 py-3 whitespace-nowrap text-slate-300"
                      title={v.comment_alt || v.last_comment || ""}
                      aria-label={v.comment_alt || v.last_comment || undefined}
                    >
                      <span title={v.comment_alt || v.last_comment || ""}>
                        {v.comment_count ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[240px] text-slate-400 text-xs">
                      <span className="line-clamp-3" title={v.comment_alt || v.last_comment || ""}>
                        {v.comment_alt || v.last_comment || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {v.url ? (
                        <a href={v.url} target="_blank" rel="noreferrer" className="text-brand-500 hover:underline inline-flex items-center gap-1 text-xs">
                          Open <ExternalLink size={12} />
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
                {(!active.videos || active.videos.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No videos parsed. Site may block server scrapers or require JavaScript rendering.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 font-semibold text-sm">
          Videos by views (dashboard uploads)
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60 text-slate-400 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Views</th>
              <th className="px-4 py-3 font-medium">Likes</th>
              <th className="px-4 py-3 font-medium">Comments</th>
              <th className="px-4 py-3 font-medium">Link</th>
            </tr>
          </thead>
          <tbody>
            {(summary?.recent || []).map((r) => (
              <tr key={r.youtube_video_id} className="border-t border-slate-800">
                <td className="px-4 py-3 max-w-[240px] truncate">{r.title || r.youtube_video_id}</td>
                <td className="px-4 py-3">{r.views?.toLocaleString?.() ?? r.views}</td>
                <td className="px-4 py-3">{r.likes?.toLocaleString?.() ?? r.likes}</td>
                <td className="px-4 py-3">{r.comments?.toLocaleString?.() ?? r.comments}</td>
                <td className="px-4 py-3">
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-brand-500 hover:underline inline-flex items-center gap-1">
                      Open <ExternalLink size={12} />
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {(!summary?.recent || summary.recent.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No upload stats yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { ExternalLink } from "lucide-react";

function Metric({ label, value }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

export default function Stats() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.statsSummary().then(setSummary).catch(console.error);
    const t = setInterval(() => {
      api.statsSummary().then(setSummary).catch(console.error);
    }, 60000);
    return () => clearInterval(t);
  }, []);

  if (!summary) {
    return <div className="text-slate-500">Loading statistics…</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Statistics</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Metric label="Uploads" value={summary.total_uploads} />
        <Metric label="Views" value={summary.total_views.toLocaleString()} />
        <Metric label="Likes" value={summary.total_likes.toLocaleString()} />
        <Metric label="Comments" value={summary.total_comments.toLocaleString()} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 font-semibold text-sm">Videos by views</div>
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
            {(summary.recent || []).map((r) => (
              <tr key={r.youtube_video_id} className="border-t border-slate-800">
                <td className="px-4 py-3 max-w-[240px] truncate">{r.title || r.youtube_video_id}</td>
                <td className="px-4 py-3">{r.views.toLocaleString()}</td>
                <td className="px-4 py-3">{r.likes.toLocaleString()}</td>
                <td className="px-4 py-3">{r.comments.toLocaleString()}</td>
                <td className="px-4 py-3">
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-brand-500 hover:underline inline-flex items-center gap-1">
                      Open <ExternalLink size={12} />
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {(summary.recent || []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No uploaded videos with stats yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

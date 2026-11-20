import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Upload, ExternalLink } from "lucide-react";

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

export default function Schedules() {
  const [items, setItems] = useState([]);

  const load = () => api.listSchedules().then(setItems).catch(console.error);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Upload Schedule</h2>
      <p className="text-sm text-slate-400 mb-4">
        After a clip job finishes, it appears here. Set a time or upload immediately.
        Auto-publish runs every minute for due items.
      </p>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60 text-slate-400 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Scheduled</th>
              <th className="px-4 py-3 font-medium">YouTube</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                <td className="px-4 py-3 max-w-[220px] truncate">{s.title}</td>
                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {s.scheduled_at ? new Date(s.scheduled_at).toLocaleString() : "ASAP"}
                </td>
                <td className="px-4 py-3">
                  {s.youtube_url ? (
                    <a href={s.youtube_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-500 hover:underline text-xs">
                      Watch <ExternalLink size={12} />
                    </a>
                  ) : "—"}
                </td>
                <td className="px-4 py-3">
                  {s.status !== "uploaded" && s.status !== "uploading" && (
                    <button
                      onClick={() => api.uploadNow(s.id).then(load)}
                      className="inline-flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg"
                    >
                      <Upload size={13} /> Upload now
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No scheduled uploads yet. Finish a clip job first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

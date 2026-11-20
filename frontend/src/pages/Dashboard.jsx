import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Scissors, CalendarClock, Eye, ThumbsUp } from "lucide-react";

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
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        colors[status] || colors.pending
      }`}
    >
      {status}
    </span>
  );
}

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    Promise.all([api.listJobs(), api.listSchedules(), api.statsSummary()])
      .then(([j, s, sum]) => {
        setJobs(j);
        setSchedules(s);
        setSummary(sum);
      })
      .catch(console.error);
  }, []);

  const processing = jobs.filter((j) => j.status === "processing").length;
  const pendingUpload = schedules.filter(
    (s) => s.status === "pending" || s.status === "scheduled"
  ).length;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card title="Active clip jobs" value={processing} icon={Scissors} sub={`${jobs.length} total`} />
        <Card title="Waiting upload" value={pendingUpload} icon={CalendarClock} />
        <Card title="Total views" value={summary?.total_views?.toLocaleString() ?? "—"} icon={Eye} />
        <Card title="Total likes" value={summary?.total_likes?.toLocaleString() ?? "—"} icon={ThumbsUp} />
      </div>

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

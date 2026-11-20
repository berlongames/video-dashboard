import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  Scissors,
  CalendarClock,
  BarChart3,
  Settings,
} from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Schedules from "./pages/Schedules";
import Stats from "./pages/Stats";
import Login from "./pages/Login";
import { useState, useEffect } from "react";
import { api, setCredentials } from "./lib/api";

function Shell({ children }) {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
      isActive
        ? "bg-brand-600 text-white"
        : "text-slate-400 hover:text-white hover:bg-slate-800"
    }`;

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col p-4">
        <div className="mb-8">
          <h1 className="text-lg font-bold tracking-tight text-white">
            Video Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">AutoClip · YouTube</p>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          <NavLink to="/" end className={linkClass}>
            <LayoutDashboard size={18} /> Overview
          </NavLink>
          <NavLink to="/jobs" className={linkClass}>
            <Scissors size={18} /> Clip Jobs
          </NavLink>
          <NavLink to="/schedules" className={linkClass}>
            <CalendarClock size={18} /> Upload Schedule
          </NavLink>
          <NavLink to="/stats" className={linkClass}>
            <BarChart3 size={18} /> Statistics
          </NavLink>
        </nav>
        <div className="text-xs text-slate-600 pt-4 border-t border-slate-800">
          Powered by AutoClip
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(
    !!localStorage.getItem("vd_pass")
  );

  useEffect(() => {
    if (!authed) return;
    // Only log out on explicit 401; network / missing API should not bounce to login
    api.me().catch((err) => {
      const msg = String(err?.message || err || "");
      if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
        localStorage.removeItem("vd_pass");
        setAuthed(false);
      }
    });
  }, [authed]);

  if (!authed) {
    return (
      <Login
        onLogin={(user, pass) => {
          setCredentials(user, pass);
          setAuthed(true);
        }}
      />
    );
  }

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/schedules" element={<Schedules />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}

import { useState } from "react";

// Front-page gate password (change in production / env later)
const REQUIRED_PASSWORD = "admin";

export default function Login({ onLogin }) {
  const [user, setUser] = useState("admin");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!pass) {
      setErr("Password required");
      return;
    }
    if (pass !== REQUIRED_PASSWORD) {
      setErr("Wrong password");
      return;
    }
    onLogin(user || "admin", pass);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl"
      >
        <h1 className="text-xl font-bold text-white mb-1">Video Dashboard</h1>
        <p className="text-sm text-slate-500 mb-6">
          Enter password to open the dashboard
        </p>
        {err && (
          <div className="mb-4 text-sm text-red-400 bg-red-950/40 px-3 py-2 rounded-lg">
            {err}
          </div>
        )}
        <label className="block text-xs text-slate-400 mb-1">Username</label>
        <input
          className="w-full mb-4 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          autoComplete="username"
        />
        <label className="block text-xs text-slate-400 mb-1">Password</label>
        <input
          type="password"
          className="w-full mb-6 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
        />
        <button
          type="submit"
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg transition"
        >
          Unlock dashboard
        </button>
      </form>
    </div>
  );
}

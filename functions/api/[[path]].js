/**
 * Cloudflare Pages Function – backend example / API proxy.
 *
 * Modes:
 * 1) If env.API_UPSTREAM is set → proxy all /api/* to your real FastAPI/VPS backend
 * 2) Else → return mock JSON so the UI can be demoed without a server
 */

const MOCK_JOBS = [
  {
    id: 1,
    title: "Demo interview clip",
    job_type: "single",
    status: "completed",
    source_paths: [],
    source_names: ["demo.mp4"],
    output_path: null,
    output_duration: 600,
    progress: 1,
    stage: "done",
    error_message: null,
    target_duration: 600,
    platform: "youtube_long",
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  },
];

const MOCK_SCHEDULES = [
  {
    id: 1,
    clip_job_id: 1,
    title: "Demo interview clip",
    description: "",
    tags: "auto,clip",
    privacy: "private",
    scheduled_at: null,
    status: "pending",
    youtube_video_id: null,
    youtube_url: null,
    error_message: null,
    auto_publish: true,
    created_at: new Date().toISOString(),
    uploaded_at: null,
  },
];

const MOCK_SUMMARY = {
  total_uploads: 0,
  total_views: 0,
  total_likes: 0,
  total_comments: 0,
  recent: [],
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "Authorization, Content-Type",
      "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    },
  });
}

export async function onRequest(context) {
  const { request, env, params } = context;

  if (request.method === "OPTIONS") {
    return json({});
  }

  const upstream = env.API_UPSTREAM;
  const url = new URL(request.url);
  const subpath = "/" + (params.path ? params.path.join("/") : "");

  if (upstream) {
    const target = new URL(upstream.replace(/\/$/, "") + "/api" + subpath);
    target.search = url.search;

    const headers = new Headers(request.headers);
    headers.delete("host");

    const init = {
      method: request.method,
      headers,
      redirect: "follow",
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = await request.arrayBuffer();
    }

    const resp = await fetch(target.toString(), init);
    const outHeaders = new Headers(resp.headers);
    outHeaders.set("access-control-allow-origin", "*");
    return new Response(resp.body, { status: resp.status, headers: outHeaders });
  }

  const path = subpath.replace(/\/$/, "") || "/";

  if (path === "/health") {
    return json({ status: "ok", service: "video-dashboard-pages-mock" });
  }
  if (path === "/auth/me") {
    return json({ username: "admin", role: "admin" });
  }
  if (path === "/jobs" && request.method === "GET") {
    return json(MOCK_JOBS);
  }
  if (path === "/jobs" && request.method === "POST") {
    return json({
      ...MOCK_JOBS[0],
      id: Date.now(),
      title: "New job (mock)",
      status: "pending",
      progress: 0,
    });
  }
  if (path.startsWith("/jobs/")) {
    return json(MOCK_JOBS[0]);
  }
  if (path === "/schedules") {
    return json(MOCK_SCHEDULES);
  }
  if (path.startsWith("/schedules/")) {
    return json(MOCK_SCHEDULES[0]);
  }
  if (path === "/stats/summary") {
    return json(MOCK_SUMMARY);
  }

  return json(
    {
      error: "not_found",
      path,
      hint: "Set API_UPSTREAM env var to proxy to your FastAPI server, or use mock routes above.",
    },
    404
  );
}

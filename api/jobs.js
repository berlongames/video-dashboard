// In-memory mock store (resets on cold start — demo only)
let jobs = [
  {
    id: 1,
    title: "Demo interview clip",
    job_type: "single",
    status: "completed",
    source_paths: [],
    source_names: ["demo.mp4"],
    output_path: null,
    output_url:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    output_duration: 600,
    progress: 1,
    stage: "done",
    error_message: null,
    target_duration: 600,
    platform: "youtube_long",
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    note: "Demo sample video",
  },
];

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
}

function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === "object") {
      resolve(req.body);
      return;
    }
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method === "GET") {
    res.status(200).json(jobs.slice().reverse());
    return;
  }

  if (req.method === "POST") {
    const body = await parseBody(req);
    const names = Array.isArray(body.source_names)
      ? body.source_names
      : body.source_names
        ? [body.source_names]
        : [];
    const urls = body.source_urls
      ? String(body.source_urls)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const job = {
      id: Date.now(),
      title: body.title || names[0] || urls[0] || "Untitled clip",
      job_type: body.job_type || "single",
      status: "processing",
      source_paths: urls,
      source_names: names.length ? names : urls,
      output_path: null,
      output_duration: null,
      progress: 0.15,
      stage: "mock_queued",
      error_message: null,
      target_duration: Number(body.target_duration) || 600,
      platform: body.platform || "youtube_long",
      created_at: new Date().toISOString(),
      completed_at: null,
      note: "Mock only — AutoClip runs on a VPS/backend, not on Vercel.",
    };
    jobs.push(job);

    setTimeout(() => {
      const j = jobs.find((x) => x.id === job.id);
      if (j) {
        j.status = "completed";
        j.progress = 1;
        j.stage = "done";
        j.output_duration = j.target_duration;
        j.completed_at = new Date().toISOString();
        j.output_url =
          "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
      }
    }, 4000);

    res.status(200).json(job);
    return;
  }

  res.status(405).json({ error: "method_not_allowed" });
};

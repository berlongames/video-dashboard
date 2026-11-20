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

module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method === "POST") {
    res.status(200).json({
      ...MOCK_JOBS[0],
      id: Date.now(),
      title: "New job (mock)",
      status: "pending",
      progress: 0,
      stage: "queued",
      completed_at: null,
    });
    return;
  }
  res.status(200).json(MOCK_JOBS);
};

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

module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  res.status(200).json(MOCK_SCHEDULES);
};

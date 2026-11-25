function getStore() {
  if (!global.__vd_schedules) {
    global.__vd_schedules = [
      {
        id: 1,
        clip_job_id: 1,
        title: "Demo interview clip",
        description: "",
        tags: "auto,clip",
        categories: "Entertainment",
        privacy: "public",
        video_type: "free",
        publish_when: "now",
        orientation: "straight",
        language: "English",
        channel_site: "",
        model: "",
        join_now_url: "",
        sponsored: false,
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
  }
  return global.__vd_schedules;
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, PATCH, POST, OPTIONS");
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method === "GET") {
    res.status(200).json(getStore().slice().reverse());
    return;
  }
  res.status(405).json({ error: "method_not_allowed" });
};

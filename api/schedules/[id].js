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

  const schedules = getStore();
  const id = Number(req.query.id);
  const item = schedules.find((s) => s.id === id);

  if (!item) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  if (req.method === "GET") {
    res.status(200).json(item);
    return;
  }

  if (req.method === "PATCH") {
    const body = await parseBody(req);
    const keys = [
      "title",
      "description",
      "tags",
      "categories",
      "privacy",
      "video_type",
      "publish_when",
      "orientation",
      "language",
      "channel_site",
      "model",
      "join_now_url",
      "sponsored",
      "scheduled_at",
      "auto_publish",
    ];
    for (const k of keys) {
      if (body[k] !== undefined) item[k] = body[k];
    }
    if (body.publish_when === "now") item.scheduled_at = null;
    res.status(200).json(item);
    return;
  }

  if (req.method === "POST") {
    item.status = "uploading";
    setTimeout(() => {
      item.status = "uploaded";
      item.uploaded_at = new Date().toISOString();
      item.youtube_video_id = "demo" + item.id;
      item.youtube_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    }, 2000);
    res.status(200).json(item);
    return;
  }

  res.status(405).json({ error: "method_not_allowed" });
};

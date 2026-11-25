function getStore() {
  if (!global.__vd_schedules) global.__vd_schedules = [];
  return global.__vd_schedules;
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  const id = Number(req.query.id);
  const item = getStore().find((s) => s.id === id);
  if (!item) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  item.status = "uploading";
  setTimeout(() => {
    item.status = "uploaded";
    item.uploaded_at = new Date().toISOString();
    item.youtube_video_id = "demo" + item.id;
    item.youtube_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  }, 1500);
  res.status(200).json(item);
};

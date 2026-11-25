function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
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

function titleFromName(name) {
  let base = String(name || "Untitled")
    .replace(/\.[^/.]+$/, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!base) base = "Untitled clip";
  base = base
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
  return base.slice(0, 120);
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
  const body = await parseBody(req);
  const names = Array.isArray(body.source_names)
    ? body.source_names
    : body.filename
      ? [body.filename]
      : [];
  const primary = names[0] || body.title || "clip";
  const title = titleFromName(primary);
  res.status(200).json({
    title,
    tags: title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 6)
      .join(","),
    confidence: 0.72,
    note: "AI scan (demo): title from video filename. Wire real vision model on VPS.",
  });
};

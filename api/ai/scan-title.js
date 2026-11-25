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

async function callOpenAICompatible({ baseUrl, apiKey, model, filename, platform }) {
  const root = String(baseUrl || "").replace(/\/+$/, "");
  const url = `${root}/chat/completions`;
  const system =
    "You generate SEO-friendly video titles and tags. Reply with JSON only: {\"title\":\"...\",\"tags\":\"comma,separated\"}. Title max 90 chars. No markdown.";
  const user = `Filename: ${filename}\nPlatform preset: ${platform || "general"}\nSuggest a title and tags for uploading this video.`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`AI HTTP ${res.status}: ${text.slice(0, 300)}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("AI returned non-JSON");
  }

  const content = data?.choices?.[0]?.message?.content || "";
  let parsed = null;
  try {
    const m = content.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : null;
  } catch {
    parsed = null;
  }

  if (parsed?.title) {
    return {
      title: String(parsed.title).slice(0, 120),
      tags: String(parsed.tags || "").slice(0, 200),
      confidence: 0.85,
      note: `AI title via ${root} · model ${model || "gpt-4o-mini"}`,
      source: "infistar",
    };
  }

  const cleaned = content.replace(/["`]/g, "").trim().slice(0, 120);
  return {
    title: cleaned || titleFromName(filename),
    tags: "",
    confidence: 0.6,
    note: `AI reply parsed loosely · model ${model || "gpt-4o-mini"}`,
    source: "infistar",
  };
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

  const apiKey = body.apiKey || process.env.INFISTAR_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl =
    body.baseUrl || process.env.INFISTAR_BASE_URL || process.env.OPENAI_BASE_URL || "";
  const model = body.model || process.env.AI_MODEL || "";

  if (apiKey && baseUrl) {
    try {
      const result = await callOpenAICompatible({
        baseUrl,
        apiKey,
        model: model && model !== "admin" ? model : "gpt-4o-mini",
        filename: primary,
        platform: body.platform,
      });
      res.status(200).json(result);
      return;
    } catch (err) {
      const fallback = titleFromName(primary);
      res.status(200).json({
        title: fallback,
        tags: fallback
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3)
          .slice(0, 6)
          .join(","),
        confidence: 0.4,
        note: `AI call failed, used filename. ${String(err.message || err).slice(0, 180)}`,
        source: "fallback",
      });
      return;
    }
  }

  const title = titleFromName(primary);
  res.status(200).json({
    title,
    tags: title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 6)
      .join(","),
    confidence: 0.5,
    note: "No AI key/base URL sent — title from filename only. Save AI connector and re-select the file.",
    source: "filename",
  });
};

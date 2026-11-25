const PH_CATEGORIES = [
  "18-25","Ai","Amateur","Anal","Arab","Asian","Babe","Babysitter (18+)","BBW",
  "Behind The Scenes","Big Ass","Big Dick","Big Tits","Blonde","Blowjob","Bondage",
  "Brazilian","British","Brunette","Bukkake","Cartoon","Casting","Celebrity",
  "College (18+)","Compilation","Cosplay","Creampie","Cuckold","Cumshot","Czech",
  "Deepthroat","Double Penetration","Ebony","Feet","Female Orgasm","Fetish","Fisting",
  "French","Gaming","Gangbang","German","Handjob","Hardcore","Hentai","Indian",
  "Interracial","Italian","Japanese","Korean","Latina","Massage","Masturbation",
  "Mature","MILF","Muscular Men","Music","Old/Young (18+)","Orgy","Parody","Party",
  "Pissing","Podcast","POV","Public","Pussy Licking","Reaction","Reality","Red Head",
  "Role Play","Romantic","Rough Sex","Russian","School (18+)","Small Tits","Smoking",
  "Solo Female","Solo Male","Squirt","Tattooed Women","Threesome","Toys","Vintage",
  "Virtual Reality","Webcam","Cartoon - Uncensored","Hentai - Uncensored",
  "Threesome - FFM","Threesome - FMM","Virtual Reality - POV",
];

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

function guessModelsFromFilename(name) {
  const base = String(name || "")
    .replace(/\.[^/.]+$/, "")
    .replace(/[\[\](){}]/g, " ");
  const parts = base.split(/[_\-.\s]+/).filter(Boolean);
  const skip = new Set([
    "hd","4k","1080p","720p","480p","xxx","mp4","scene","full","video","porn",
    "sex","hot","new","and","the","with","feat","ft",
  ]);
  const names = [];
  for (const p of parts) {
    if (skip.has(p.toLowerCase())) continue;
    if (/^\d+$/.test(p)) continue;
    if (p.length < 2 || p.length > 20) continue;
    if (/^[A-Za-z]+$/.test(p) && p[0] === p[0].toUpperCase()) {
      names.push(p);
    }
    if (names.length >= 4) break;
  }
  return names.slice(0, 3).join(", ");
}

function normalizeCategories(raw) {
  const allowed = new Set(PH_CATEGORIES.map((c) => c.toLowerCase()));
  const byLower = Object.fromEntries(PH_CATEGORIES.map((c) => [c.toLowerCase(), c]));
  let list = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === "string") list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const item of list) {
    const key = String(item).toLowerCase();
    if (allowed.has(key) && byLower[key] && !out.includes(byLower[key])) {
      out.push(byLower[key]);
    }
  }
  if (out.length > 8) return out.slice(0, 8);
  if (out.length >= 2) return out;
  const pad = ["Amateur", "Hardcore", "Babe", "POV", "Reality"];
  for (const p of pad) {
    if (out.length >= 2) break;
    if (!out.includes(p)) out.push(p);
  }
  return out.slice(0, 8);
}

async function callOpenAICompatible({ baseUrl, apiKey, model, filename, platform }) {
  const root = String(baseUrl || "").replace(/\/+$/, "");
  const url = `${root}/chat/completions`;
  const catList = PH_CATEGORIES.join(", ");
  const system = `You generate SEO-friendly adult tube video metadata.
Reply with JSON only (no markdown):
{"title":"...","tags":"comma,separated","categories":["Cat1","Cat2",...],"model":"Name1, Name2"}
Rules:
- title max 90 chars
- tags: short keywords
- categories: pick BETWEEN 2 and 8 items, ONLY from this exact list: ${catList}
- model: performer / actor names if present in the filename (comma-separated). Use empty string if unknown. Do not invent famous stars not suggested by the filename.
- Do not invent categories outside the list.`;

  const user = `Filename: ${filename}\nPlatform: ${platform || "ph"}\nSuggest title, tags, 2-8 categories from the allowed list, and model/performer names if the filename implies them.`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model && model !== "admin" ? model : "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`AI HTTP ${res.status}: ${text.slice(0, 300)}`);

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

  const title = parsed?.title
    ? String(parsed.title).slice(0, 120)
    : content.replace(/["`]/g, "").trim().slice(0, 120) || titleFromName(filename);

  const tags = parsed?.tags ? String(parsed.tags).slice(0, 200) : "";
  const categories = normalizeCategories(parsed?.categories);
  const modelNames = parsed?.model
    ? String(parsed.model).slice(0, 200)
    : guessModelsFromFilename(filename);

  return {
    title,
    tags,
    categories,
    categories_csv: categories.join(", "),
    model: modelNames,
    confidence: parsed?.title ? 0.85 : 0.6,
    note:
      `AI via ${root} · llm ${model && model !== "admin" ? model : "gpt-4o-mini"} · ${categories.length} cats` +
      (modelNames ? ` · models: ${modelNames}` : ""),
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
        model,
        filename: primary,
        platform: body.platform,
      });
      res.status(200).json(result);
      return;
    } catch (err) {
      const fallback = titleFromName(primary);
      const categories = normalizeCategories(["Amateur", "Hardcore"]);
      res.status(200).json({
        title: fallback,
        tags: fallback
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3)
          .slice(0, 6)
          .join(","),
        categories,
        categories_csv: categories.join(", "),
        model: guessModelsFromFilename(primary),
        confidence: 0.4,
        note: `AI call failed, used filename. ${String(err.message || err).slice(0, 180)}`,
        source: "fallback",
      });
      return;
    }
  }

  const title = titleFromName(primary);
  const categories = normalizeCategories(["Amateur", "Hardcore"]);
  res.status(200).json({
    title,
    tags: title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 6)
      .join(","),
    categories,
    categories_csv: categories.join(", "),
    model: guessModelsFromFilename(primary),
    confidence: 0.5,
    note: "No AI key/base URL — filename title + default categories.",
    source: "filename",
  });
};

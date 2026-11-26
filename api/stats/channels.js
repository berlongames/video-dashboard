function getStore() {
  if (!global.__vd_channels) global.__vd_channels = [];
  return global.__vd_channels;
}

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

function channelLabelFromUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    let slug = parts[parts.length - 1] || "channel";
    if (slug === "videos" && parts.length >= 2) slug = parts[parts.length - 2];
    const name = decodeURIComponent(slug)
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
    return `Channel ${name}`;
  } catch {
    return "Channel";
  }
}

function decodeHtml(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripTags(s) {
  return decodeHtml(String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function parseListing(html) {
  const videos = [];
  const titleRe =
    /class=["'][^"']*\btitle\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|a|div|h1|h2|h3)>/gi;
  const viewsRe =
    /class=["'][^"']*\bviews\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|div|var|li)>/gi;

  const titles = [];
  let m;
  while ((m = titleRe.exec(html)) && titles.length < 40) {
    const t = stripTags(m[1]);
    if (t && t.length > 2 && t.length < 200 && !/^view/i.test(t)) titles.push(t);
  }

  const views = [];
  while ((m = viewsRe.exec(html)) && views.length < 40) {
    const v = stripTags(m[1]);
    if (v) views.push(v);
  }

  const linkRe = /href=["']((?:https?:\/\/[^"']+)?\/view_video\.php\?viewkey=[a-zA-Z0-9]+)["']/gi;
  const links = [];
  while ((m = linkRe.exec(html)) && links.length < 40) {
    let href = m[1];
    if (href.startsWith("/")) href = "https://www.pornhub.com" + href;
    if (!links.includes(href)) links.push(href);
  }

  const n = Math.max(titles.length, Math.min(views.length, links.length) || titles.length);
  for (let i = 0; i < Math.min(n, 25); i++) {
    videos.push({
      title: titles[i] || `Video ${i + 1}`,
      views: views[i] || "—",
      url: links[i] || null,
      comment_count: null,
      last_comment: null,
    });
  }
  return videos;
}

function parseVideoPage(html) {
  let comment_count = null;
  let last_comment = null;

  const headerRe =
    /class=["'][^"']*\bcmtHeader\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|span|h1|h2|h3)>/i;
  const hm = html.match(headerRe);
  if (hm) {
    const text = stripTags(hm[1]);
    const num = text.match(/(\d[\d,]*)/);
    if (num) comment_count = num[1].replace(/,/g, "");
    else comment_count = text;
  }

  const cmtRe =
    /class=["'][^"']*\bcommentMessage\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|span|p)>/gi;
  let m;
  let last = null;
  while ((m = cmtRe.exec(html))) {
    const t = stripTags(m[1]);
    if (t) last = t;
  }
  last_comment = last;

  return { comment_count, last_comment };
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

async function scrapeChannel(url) {
  const label = channelLabelFromUrl(url);
  let html;
  try {
    html = await fetchHtml(url);
  } catch (e) {
    return {
      ok: false,
      label,
      url,
      error: String(e.message || e),
      videos: [],
      note: "Fetch failed (site may block serverless scrapers). Try from a VPS with a real browser later.",
    };
  }

  const videos = parseListing(html);
  const limit = Math.min(videos.length, 5);
  for (let i = 0; i < limit; i++) {
    if (!videos[i].url) continue;
    try {
      const vhtml = await fetchHtml(videos[i].url);
      const meta = parseVideoPage(vhtml);
      videos[i].comment_count = meta.comment_count;
      videos[i].last_comment = meta.last_comment;
    } catch {
      /* leave nulls */
    }
  }

  return {
    ok: videos.length > 0,
    label,
    url,
    videos,
    scraped_at: new Date().toISOString(),
    note:
      videos.length > 0
        ? `Parsed ${videos.length} titles/views; comments fetched for up to ${limit} videos.`
        : "HTML fetched but no title/views blocks matched (page may be JS-rendered or blocked).",
  };
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const store = getStore();

  if (req.method === "GET") {
    res.status(200).json(store.slice().reverse());
    return;
  }

  if (req.method === "POST") {
    const body = await parseBody(req);
    const url = String(body.url || "").trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      res.status(400).json({ error: "valid_url_required" });
      return;
    }

    const scraped = await scrapeChannel(url);
    const entry = {
      id: Date.now(),
      label: scraped.label,
      url,
      videos: scraped.videos,
      scraped_at: scraped.scraped_at || new Date().toISOString(),
      note: scraped.note,
      ok: scraped.ok,
      error: scraped.error || null,
    };
    store.push(entry);
    res.status(200).json(entry);
    return;
  }

  if (req.method === "DELETE") {
    const body = await parseBody(req);
    const id = Number(body.id);
    const idx = store.findIndex((c) => c.id === id);
    if (idx >= 0) store.splice(idx, 1);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "method_not_allowed" });
};

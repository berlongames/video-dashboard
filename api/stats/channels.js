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

function parseThumbnailInfoWrappers(html) {
  const videos = [];
  const seen = new Set();

  const openRe =
    /<([a-z0-9]+)([^>]*\bclass=["'][^"']*\bthumbnail-info-wrapper\b[^"']*["'][^>]*)>/gi;

  let m;
  const opens = [];
  while ((m = openRe.exec(html))) {
    opens.push({ index: m.index, tag: m[1], full: m[0] });
  }

  for (let i = 0; i < opens.length; i++) {
    const start = opens[i].index;
    const end = i + 1 < opens.length ? opens[i + 1].index : Math.min(html.length, start + 4000);
    const block = html.slice(start, end);

    if (!/\bthumbnail-info-wrapper\b/i.test(block)) continue;

    const linkM = block.match(
      /href=["']((?:https?:\/\/[^"']+)?\/view_video\.php\?viewkey=([a-zA-Z0-9]+))["']/i
    );
    if (!linkM) continue;
    const viewkey = linkM[2];
    if (seen.has(viewkey)) continue;
    let href = linkM[1];
    if (href.startsWith("/")) href = "https://www.pornhub.com" + href;

    let title = "";
    const titleM = block.match(
      /class=["'][^"']*\btitle\b[^"']*["'][^>]*>[\s\S]*?<a[^>]+href=["'][^"']*viewkey=[^"']+["'][^>]*>([\s\S]*?)<\/a>/i
    );
    if (titleM) title = stripTags(titleM[1]);
    if (!title) {
      const aM = block.match(
        new RegExp(
          `href=["'][^"']*viewkey=${viewkey}["'][^>]*>([\\s\\S]*?)<\\/a>`,
          "i"
        )
      );
      if (aM) title = stripTags(aM[1]);
    }
    if (!title || title.length < 2) title = `Video ${viewkey}`;

    let views = "—";
    const viewsM = block.match(
      /class=["'][^"']*\bviews\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|div|var|li|a)>/i
    );
    if (viewsM) views = stripTags(viewsM[1]) || "—";

    seen.add(viewkey);
    videos.push({
      title: title.slice(0, 200),
      views,
      url: href,
      viewkey,
      comment_count: null,
      last_comment: null,
    });
    if (videos.length >= 40) break;
  }

  return videos;
}

function parseFallbackListing(html) {
  const videos = [];
  const seen = new Set();
  const re =
    /<a[^>]+href=["']((?:https?:\/\/[^"']+)?\/view_video\.php\?viewkey=([a-zA-Z0-9]+))["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) && videos.length < 40) {
    const viewkey = m[2];
    if (seen.has(viewkey)) continue;
    let href = m[1];
    if (href.startsWith("/")) href = "https://www.pornhub.com" + href;
    const title = stripTags(m[3]);
    if (!title || title.length < 3) continue;
    seen.add(viewkey);
    videos.push({
      title: title.slice(0, 200),
      views: "—",
      url: href,
      viewkey,
      comment_count: null,
      last_comment: null,
    });
  }
  return videos;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseVideoComments(html) {
  let comment_count = null;
  let last_comment = null;

  // Prefer #cmtWrapper / .cmtHeader:
  // <div class="cmtHeader"><h2>All Comments <span>(4)</span></h2></div>
  const wrapperIdx = html.search(/id=["']cmtWrapper["']/i);
  const headerIdx = html.search(/class=["'][^"']*\bcmtHeader\b/i);
  const regionStart = wrapperIdx >= 0 ? wrapperIdx : headerIdx >= 0 ? headerIdx : -1;
  if (regionStart >= 0) {
    const region = html.slice(regionStart, regionStart + 8000);

    let m =
      region.match(/cmtHeader[\s\S]{0,400}?<span[^>]*>\s*\(\s*([\d,]+)\s*\)\s*<\/span>/i) ||
      region.match(/All\s*Comments[\s\S]{0,120}?<span[^>]*>\s*\(?\s*([\d,]+)\s*\)?\s*<\/span>/i) ||
      region.match(/class=["'][^"']*\bcmtHeader\b[^"']*["'][\s\S]{0,500}?\(\s*([\d,]+)\s*\)/i);
    if (m) {
      comment_count = m[1].replace(/,/g, "");
    } else {
      const text = stripTags(
        (region.match(/class=["'][^"']*\bcmtHeader\b[^"']*["'][^>]*>([\s\S]{0,800})/i) || [])[1] ||
          region.slice(0, 500)
      );
      const num = text.match(/(\d[\d,]*)/);
      if (num) comment_count = num[1].replace(/,/g, "");
    }
  }

  if (comment_count == null) {
    const g = html.match(/All\s*Comments[\s\S]{0,80}?\(\s*([\d,]+)\s*\)/i);
    if (g) comment_count = g[1].replace(/,/g, "");
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
      Referer: "https://www.pornhub.com/",
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
      note: "Fetch failed (site may block serverless scrapers).",
    };
  }

  await sleep(800);
  let videos = parseThumbnailInfoWrappers(html);
  let source = "thumbnail-info-wrapper";
  if (videos.length === 0) {
    videos = parseFallbackListing(html);
    source = "fallback-links";
  }

  const limit = Math.min(videos.length, 12);
  const delayMs = 1200;
  for (let i = 0; i < limit; i++) {
    if (!videos[i].url) continue;
    if (i > 0) await sleep(delayMs);
    try {
      const vhtml = await fetchHtml(videos[i].url);
      const meta = parseVideoComments(vhtml);
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
        ? `Source: ${source}. ${videos.length} videos; comments from ${limit} pages (1.2s delay).`
        : "No thumbnail-info-wrapper (or links) found — HTML empty or JS-rendered.",
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

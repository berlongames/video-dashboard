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

function extractVideoUListBlock(html) {
  const openRe =
    /<([a-z0-9]+)([^>]*\bclass=["'][^"']*\bvideoUList\b[^"']*\bclearfix\b[^"']*["'][^>]*)>/i;
  const m = html.match(openRe);
  if (!m) {
    const open2 = /<([a-z0-9]+)([^>]*\bclass=["'][^"']*\bvideoUList\b[^"']*["'][^>]*)>/i;
    const m2 = html.match(open2);
    if (!m2) return null;
    return sliceBalanced(html, m2.index, m2[1]);
  }
  return sliceBalanced(html, m.index, m[1]);
}

function sliceBalanced(html, startIdx, tagName) {
  const tag = tagName.toLowerCase();
  const openTag = new RegExp(`<${tag}\\b`, "gi");
  const closeTag = new RegExp(`</${tag}\\s*>`, "gi");
  openTag.lastIndex = startIdx;
  const first = openTag.exec(html);
  if (!first) return null;

  let depth = 1;
  let pos = first.index + first[0].length;
  while (depth > 0 && pos < html.length) {
    openTag.lastIndex = pos;
    closeTag.lastIndex = pos;
    const nextOpen = openTag.exec(html);
    const nextClose = closeTag.exec(html);
    if (!nextClose) break;
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth += 1;
      pos = nextOpen.index + nextOpen[0].length;
    } else {
      depth -= 1;
      pos = nextClose.index + nextClose[0].length;
      if (depth === 0) {
        return html.slice(first.index, pos);
      }
    }
  }
  return html.slice(first.index, Math.min(html.length, first.index + 500000));
}

function parseListingFromVideoUList(html) {
  const block = extractVideoUListBlock(html) || html;
  const videos = [];
  const seenKeys = new Set();

  const linkTitleRe =
    /<a[^>]+href=["']((?:https?:\/\/[^"']+)?\/view_video\.php\?viewkey=([a-zA-Z0-9]+))["'][^>]*>([\s\S]*?)<\/a>/gi;

  let m;
  while ((m = linkTitleRe.exec(block)) && videos.length < 40) {
    const viewkey = m[2];
    if (seenKeys.has(viewkey)) continue;
    let href = m[1];
    if (href.startsWith("/")) href = "https://www.pornhub.com" + href;
    let title = stripTags(m[3]);
    if (!title || title.length < 3) continue;
    if (title.length > 200) title = title.slice(0, 200);
    seenKeys.add(viewkey);
    videos.push({
      title,
      views: "—",
      url: href,
      viewkey,
      comment_count: null,
      last_comment: null,
    });
  }

  if (videos.length < 5) {
    const titleRe =
      /class=["'][^"']*\btitle\b[^"']*["'][^>]*>[\s\S]*?<a[^>]+href=["']((?:https?:\/\/[^"']+)?\/view_video\.php\?viewkey=([a-zA-Z0-9]+))["'][^>]*>([\s\S]*?)<\/a>/gi;
    while ((m = titleRe.exec(block)) && videos.length < 40) {
      const viewkey = m[2];
      if (seenKeys.has(viewkey)) continue;
      let href = m[1];
      if (href.startsWith("/")) href = "https://www.pornhub.com" + href;
      const title = stripTags(m[3]);
      if (!title || title.length < 3) continue;
      seenKeys.add(viewkey);
      videos.push({
        title: title.slice(0, 200),
        views: "—",
        url: href,
        viewkey,
        comment_count: null,
        last_comment: null,
      });
    }
  }

  for (const v of videos) {
    const key = v.viewkey;
    const nearby = block.indexOf(key);
    if (nearby < 0) continue;
    const slice = block.slice(Math.max(0, nearby - 200), nearby + 800);
    const vm = slice.match(
      /class=["'][^"']*\bviews\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|div|var|li)>/i
    );
    if (vm) v.views = stripTags(vm[1]) || "—";
  }

  return videos;
}

function parseVideoComments(html) {
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

  const videos = parseListingFromVideoUList(html);

  const limit = Math.min(videos.length, 12);
  for (let i = 0; i < limit; i++) {
    if (!videos[i].url) continue;
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
        ? `Titles from videoUList clearfix: ${videos.length}. Comments scraped for ${limit} video pages.`
        : "No videos found inside videoUList clearfix (blocked or JS-rendered HTML).",
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

// Demo: accept AI connector metadata (do not persist secrets in production this way)
let last = null;

module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method === "GET") {
    res.status(200).json(
      last || { configured: false, provider: null, model: null, hasKey: false }
    );
    return;
  }
  if (req.method === "POST") {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    last = {
      configured: true,
      provider: body?.provider || null,
      model: body?.model || null,
      baseUrl: body?.baseUrl || null,
      hasKey: !!body?.hasKey,
      apiKeyHint: body?.apiKeyHint || "",
      updatedAt: new Date().toISOString(),
    };
    res.status(200).json(last);
    return;
  }
  res.status(405).json({ error: "method_not_allowed" });
};

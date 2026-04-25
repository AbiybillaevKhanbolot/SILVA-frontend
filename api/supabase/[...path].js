const PROJECT_SUPABASE_URL = "https://siqvswjrhmckufuaomhy.supabase.co";

function buildTargetUrl(req) {
  const partsRaw = req.query && req.query.path;
  const parts = Array.isArray(partsRaw) ? partsRaw : partsRaw ? [partsRaw] : [];
  const path = parts.map((p) => encodeURIComponent(String(p))).join("/");
  const queryIndex = req.url.indexOf("?");
  const query = queryIndex >= 0 ? req.url.slice(queryIndex) : "";
  return `${PROJECT_SUPABASE_URL}/${path}${query}`;
}

function pickRequestHeaders(req) {
  const allow = [
    "authorization",
    "apikey",
    "x-client-info",
    "content-type",
    "accept",
    "accept-profile",
    "content-profile",
    "prefer",
    "range",
    "if-none-match"
  ];
  const out = {};
  allow.forEach((key) => {
    const value = req.headers[key];
    if (value != null && value !== "") out[key] = value;
  });
  return out;
}

function toRequestBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  if (req.body == null) return undefined;
  if (typeof req.body === "string" || Buffer.isBuffer(req.body)) return req.body;
  return JSON.stringify(req.body);
}

module.exports = async function handler(req, res) {
  const targetUrl = buildTargetUrl(req);

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD");
    res.status(204).end();
    return;
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: pickRequestHeaders(req),
      body: toRequestBody(req),
      redirect: "follow"
    });

    res.status(upstream.status);

    const ct = upstream.headers.get("content-type");
    if (ct) res.setHeader("content-type", ct);
    const etag = upstream.headers.get("etag");
    if (etag) res.setHeader("etag", etag);
    const cacheControl = upstream.headers.get("cache-control");
    if (cacheControl) res.setHeader("cache-control", cacheControl);
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) res.setHeader("content-range", contentRange);

    const bodyText = await upstream.text();
    res.send(bodyText);
  } catch (error) {
    res.status(502).json({
      error: "supabase_proxy_error",
      message: error && error.message ? error.message : "Failed to reach Supabase upstream."
    });
  }
};

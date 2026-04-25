const YK_API = "https://api.yookassa.ru/v3";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secret) {
    res.status(503).json({ error: "yookassa_env_missing" });
    return;
  }

  const id = req.query && req.query.id ? String(req.query.id) : "";
  if (!id) {
    res.status(400).json({ error: "missing_id" });
    return;
  }

  const auth = Buffer.from(`${shopId}:${secret}`, "utf8").toString("base64");
  try {
    const ykRes = await fetch(`${YK_API}/payments/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const data = await ykRes.json().catch(() => ({}));
    if (!ykRes.ok) {
      res.status(502).json({ error: "yookassa_error", detail: data });
      return;
    }
    res.status(200).json({
      id: data.id,
      status: data.status,
      paid: data.paid === true,
      amount: data.amount,
      metadata: data.metadata,
      test: data.test === true,
    });
  } catch (e) {
    res.status(500).json({
      error: "server_error",
      message: e && e.message ? String(e.message) : "error",
    });
  }
}

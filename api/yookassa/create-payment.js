const YK_API = "https://api.yookassa.ru/v3";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

function originFromRequest(req) {
  const o = req.headers.origin;
  if (o) return String(o).replace(/\/$/, "");
  const ref = req.headers.referer;
  if (ref) {
    try {
      return new URL(ref).origin;
    } catch (e) {}
  }
  return "";
}

function randomKey() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secret) {
    res.status(503).json({
      error: "yookassa_env_missing",
      message: "Set YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY in Vercel Environment Variables.",
    });
    return;
  }

  const amountRub = Number(req.body && req.body.amountRub);
  if (!(amountRub > 0) || amountRub > 10_000_000 || !Number.isFinite(amountRub)) {
    res.status(400).json({ error: "invalid_amount" });
    return;
  }

  const origin = originFromRequest(req);
  if (!origin) {
    res.status(400).json({ error: "missing_origin" });
    return;
  }
  const returnUrl = `${origin}/legacy/booking-return.html`;

  const metaIn = req.body && typeof req.body.metadata === "object" && req.body.metadata ? req.body.metadata : {};
  const metadata = {};
  Object.keys(metaIn).forEach((k) => {
    metadata[String(k).slice(0, 64)] = String(metaIn[k] == null ? "" : metaIn[k]).slice(0, 256);
  });

  const auth = Buffer.from(`${shopId}:${secret}`, "utf8").toString("base64");
  const idempotenceKey = randomKey();

  try {
    const ykRes = await fetch(`${YK_API}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Idempotence-Key": idempotenceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: { value: amountRub.toFixed(2), currency: "RUB" },
        confirmation: { type: "redirect", return_url: returnUrl },
        capture: true,
        description: String((req.body && req.body.description) || "Бронирование Silva").slice(0, 128),
        metadata,
      }),
    });
    const data = await ykRes.json().catch(() => ({}));
    if (!ykRes.ok) {
      res.status(502).json({ error: "yookassa_error", detail: data });
      return;
    }
    const confirmationUrl = data && data.confirmation && data.confirmation.confirmation_url;
    if (!confirmationUrl) {
      res.status(502).json({ error: "no_confirmation_url", detail: data });
      return;
    }
    res.status(200).json({
      paymentId: data.id,
      confirmationUrl,
      test: data.test === true,
    });
  } catch (e) {
    res.status(500).json({
      error: "server_error",
      message: e && e.message ? String(e.message) : "error",
    });
  }
}

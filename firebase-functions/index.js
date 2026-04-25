import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

const YK_API = "https://api.yookassa.ru/v3";

const YOOKASSA_SHOP_ID = defineSecret("YOOKASSA_SHOP_ID");
const YOOKASSA_SECRET_KEY = defineSecret("YOOKASSA_SECRET_KEY");

function cors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

function originFromRequest(req) {
  const o = req.get("origin");
  if (o) return String(o).replace(/\/$/, "");
  const ref = req.get("referer");
  if (ref) {
    try {
      return new URL(ref).origin;
    } catch {}
  }
  return "";
}

export const yookassaCreatePayment = onRequest(
  {
    region: "europe-west1",
    secrets: [YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY],
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (req, res) => {
    cors(res);
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ error: "method_not_allowed" });
      return;
    }

    const shopId = YOOKASSA_SHOP_ID.value();
    const secret = YOOKASSA_SECRET_KEY.value();
    if (!shopId || !secret) {
      res.status(503).json({ error: "yookassa_env_missing", message: "Set YOOKASSA_* Firebase secrets." });
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
      metadata[String(k).slice(0, 64)] = String(metaIn[k] ?? "").slice(0, 256);
    });

    const auth = Buffer.from(`${shopId}:${secret}`, "utf8").toString("base64");
    const idempotenceKey = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

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
      const confirmationUrl = data?.confirmation?.confirmation_url;
      if (!confirmationUrl) {
        res.status(502).json({ error: "no_confirmation_url", detail: data });
        return;
      }
      res.status(200).json({ paymentId: data.id, confirmationUrl, test: data.test === true });
    } catch (e) {
      res.status(500).json({ error: "server_error", message: e?.message ? String(e.message) : "error" });
    }
  }
);

export const yookassaPaymentStatus = onRequest(
  {
    region: "europe-west1",
    secrets: [YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY],
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (req, res) => {
    cors(res);
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "GET") {
      res.status(405).json({ error: "method_not_allowed" });
      return;
    }

    const shopId = YOOKASSA_SHOP_ID.value();
    const secret = YOOKASSA_SECRET_KEY.value();
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
      res.status(500).json({ error: "server_error", message: e?.message ? String(e.message) : "error" });
    }
  }
);

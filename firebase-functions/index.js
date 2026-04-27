import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

const YK_API = "https://api.yookassa.ru/v3";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_OPENROUTER_MODEL = "openai/gpt-oss-120b:free";
const SILVA_SYSTEM_PROMPT =
  "Ты помощник сайта Silva (https://silva01.vercel.app/). Не выдумывай объекты и ссылки; только официальный домен и путь /property?id=.";

const YOOKASSA_SHOP_ID = defineSecret("YOOKASSA_SHOP_ID");
const YOOKASSA_SECRET_KEY = defineSecret("YOOKASSA_SECRET_KEY");
const OPENROUTER_API_KEY = defineSecret("OPENROUTER_API_KEY");
const OPENROUTER_MODEL = defineSecret("OPENROUTER_MODEL");

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

function sanitizeChatMessages(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const m of raw.slice(-40)) {
    if (!m || typeof m !== "object") continue;
    const role = m.role === "user" || m.role === "assistant" || m.role === "system" ? m.role : null;
    const content = typeof m.content === "string" ? m.content.trim() : "";
    if (!role || !content) continue;
    out.push({ role, content: content.slice(0, 12_000) });
  }
  return out;
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

export const silvaOpenrouterChat = onRequest(
  {
    region: "europe-west1",
    secrets: [OPENROUTER_API_KEY, OPENROUTER_MODEL],
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

    const apiKey = OPENROUTER_API_KEY.value();
    const model = String(OPENROUTER_MODEL.value() || DEFAULT_OPENROUTER_MODEL).trim() || DEFAULT_OPENROUTER_MODEL;
    if (!apiKey || !String(apiKey).trim()) {
      res.status(503).json({
        error: "openrouter_env_missing",
        message: "Set OPENROUTER_API_KEY Firebase secret.",
      });
      return;
    }

    let messages = sanitizeChatMessages(req.body && req.body.messages);
    if (messages.length === 0) {
      res.status(400).json({ error: "no_messages" });
      return;
    }
    if (messages[0].role !== "system") {
      messages = [{ role: "system", content: SILVA_SYSTEM_PROMPT }, ...messages];
    }

    const referer = req.get("referer") || req.get("origin") || "https://silva";
    try {
      const orRes = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${String(apiKey).trim()}`,
          "Content-Type": "application/json",
          "HTTP-Referer": String(referer).slice(0, 256),
          "X-Title": "Silva",
        },
        body: JSON.stringify({ model, messages }),
      });
      const data = await orRes.json().catch(() => ({}));
      if (!orRes.ok) {
        const msg =
          (data && data.error && data.error.message) ||
          (data && data.message) ||
          `openrouter_http_${orRes.status}`;
        res.status(502).json({ error: "openrouter_error", message: String(msg).slice(0, 500) });
        return;
      }
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        res.status(502).json({ error: "openrouter_bad_response" });
        return;
      }
      res.status(200).json({ content: content.trim() });
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

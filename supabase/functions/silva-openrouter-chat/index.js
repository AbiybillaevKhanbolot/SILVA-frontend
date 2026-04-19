/**
 * Прод: чат OpenRouter без утечки ключа во фронт.
 * Секреты: OPENROUTER_API_KEY, опционально OPENROUTER_MODEL (по умолчанию openai/gpt-oss-120b:free)
 * Деплой: supabase secrets set OPENROUTER_API_KEY=...
 *          supabase functions deploy silva-openrouter-chat --no-verify-jwt
 *
 * Файл .js — без TypeScript, чтобы IDE не ругалась на глобал Deno (в Edge он есть).
 */
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b:free";

const SILVA_SYSTEM_FALLBACK =
  "Ты помощник сайта Silva (https://silva01.vercel.app/). Не выдумывай объекты и ссылки; только официальный домен и путь /property?id=.";

let SILVA_SYSTEM = SILVA_SYSTEM_FALLBACK;
try {
  SILVA_SYSTEM = (
    await Deno.readTextFile(new URL("./silva-ai-system-prompt.txt", import.meta.url))
  ).trim();
} catch {
  SILVA_SYSTEM = SILVA_SYSTEM_FALLBACK;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** @param {unknown} raw */
function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const m of raw.slice(-40)) {
    if (!m || typeof m !== "object") continue;
    const o = /** @type {Record<string, unknown>} */ (m);
    const role = o.role === "user" || o.role === "assistant" || o.role === "system" ? o.role : null;
    const content = typeof o.content === "string" ? o.content.trim() : "";
    if (!role || !content) continue;
    out.push({ role, content: content.slice(0, 12_000) });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  const model = (Deno.env.get("OPENROUTER_MODEL") || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  if (!apiKey || !apiKey.trim()) {
    return new Response(
      JSON.stringify({
        error: "openrouter_env_missing",
        message: "Задайте OPENROUTER_API_KEY в Secrets проекта Supabase.",
      }),
      { status: 503, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  /** @type {Record<string, unknown>} */
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let messages = sanitizeMessages(body.messages);
  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: "no_messages" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  if (messages[0].role !== "system") {
    messages = [{ role: "system", content: SILVA_SYSTEM }, ...messages];
  }

  const referer = req.headers.get("referer") || req.headers.get("origin") || "https://silva";

  try {
    const orRes = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": referer.slice(0, 256),
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
      return new Response(JSON.stringify({ error: "openrouter_error", message: String(msg).slice(0, 500) }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (typeof content !== "string") {
      return new Response(JSON.stringify({ error: "openrouter_bad_response" }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "error";
    return new Response(JSON.stringify({ error: "server_error", message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

/**
 * Создание платежа ЮKassa (прод). Секреты: YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY в Supabase Secrets.
 * Деплой: supabase functions deploy yookassa-create-payment --no-verify-jwt
 */
const YK = "https://api.yookassa.ru/v3";

function originFromRequest(req: Request): string {
  const o = req.headers.get("origin");
  if (o) return o.replace(/\/$/, "");
  const ref = req.headers.get("referer");
  if (ref) {
    try {
      return new URL(ref).origin;
    } catch {
      return "";
    }
  }
  return "";
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

  const shopId = Deno.env.get("YOOKASSA_SHOP_ID");
  const secret = Deno.env.get("YOOKASSA_SECRET_KEY");
  if (!shopId || !secret) {
    return new Response(
      JSON.stringify({ error: "yookassa_env_missing", message: "Задайте секреты YOOKASSA_* в проекте Supabase" }),
      { status: 503, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const amountRub = Number(body.amountRub);
  if (!(amountRub > 0) || amountRub > 10_000_000 || !Number.isFinite(amountRub)) {
    return new Response(JSON.stringify({ error: "invalid_amount" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const origin = originFromRequest(req);
  const returnUrl = origin ? `${origin}/legacy/booking-return.html` : "";

  if (!returnUrl) {
    return new Response(JSON.stringify({ error: "missing_origin" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const metadata =
    body.metadata && typeof body.metadata === "object" && body.metadata !== null
      ? Object.fromEntries(
          Object.entries(body.metadata as Record<string, unknown>).map(([k, v]) => [
            String(k).slice(0, 64),
            String(v ?? "").slice(0, 256),
          ]),
        )
      : {};

  const idempotenceKey = crypto.randomUUID();
  const auth = btoa(`${shopId}:${secret}`);

  const ykRes = await fetch(`${YK}/payments`, {
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
      description: String(body.description || "Бронирование Silva").slice(0, 128),
      metadata,
    }),
  });

  const data = await ykRes.json();
  if (!ykRes.ok) {
    return new Response(JSON.stringify({ error: "yookassa_error", detail: data }), {
      status: 502,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const confirmationUrl = data?.confirmation?.confirmation_url;
  if (!confirmationUrl) {
    return new Response(JSON.stringify({ error: "no_confirmation_url", detail: data }), {
      status: 502,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      paymentId: data.id,
      confirmationUrl,
      test: data.test === true,
    }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
  );
});

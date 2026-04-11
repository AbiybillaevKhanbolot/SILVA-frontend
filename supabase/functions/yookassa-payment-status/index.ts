/**
 * Статус платежа ЮKassa (прод). Секреты: YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY.
 * Деплой: supabase functions deploy yookassa-payment-status --no-verify-jwt
 */
const YK = "https://api.yookassa.ru/v3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const shopId = Deno.env.get("YOOKASSA_SHOP_ID");
  const secret = Deno.env.get("YOOKASSA_SECRET_KEY");
  if (!shopId || !secret) {
    return new Response(JSON.stringify({ error: "yookassa_env_missing" }), {
      status: 503,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return new Response(JSON.stringify({ error: "missing_id" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const auth = btoa(`${shopId}:${secret}`);
  const ykRes = await fetch(`${YK}/payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const data = await ykRes.json();

  if (!ykRes.ok) {
    return new Response(JSON.stringify({ error: "yookassa_error", detail: data }), {
      status: 502,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      id: data.id,
      status: data.status,
      paid: data.paid === true,
      amount: data.amount,
      metadata: data.metadata,
      test: data.test === true,
    }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
  );
});

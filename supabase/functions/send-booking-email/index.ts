/**
 * Письмо гостю после успешной оплаты и создания брони.
 * Вызов из booking-return.js с JWT сессии + apikey (anon).
 * Секреты: RESEND_API_KEY; опционально SILVA_BOOKING_FROM_EMAIL, SILVA_SITE_URL.
 * Деплой: supabase functions deploy send-booking-email --no-verify-jwt
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API = "https://api.resend.com/emails";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatRuDate(iso: string): string {
  const t = String(iso || "").trim();
  if (!t) return "—";
  const d = new Date(t + (t.length === 10 ? "T12:00:00" : ""));
  if (Number.isNaN(d.getTime())) return t;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }

  const resendKey = (Deno.env.get("RESEND_API_KEY") || "").trim();
  if (!resendKey) {
    return json(503, {
      error: "resend_not_configured",
      message: "Добавьте секрет RESEND_API_KEY в Supabase → Edge Functions → Secrets.",
    });
  }

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") || "").trim();
  const anonKey = (Deno.env.get("SUPABASE_ANON_KEY") || "").trim();
  if (!supabaseUrl || !anonKey) {
    return json(500, { error: "supabase_env_missing" });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, { error: "missing_authorization" });
  }
  if (!apikey.trim()) {
    return json(401, { error: "missing_apikey" });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const rawId = body.bookingId;
  if (rawId == null || (typeof rawId !== "string" && typeof rawId !== "number")) {
    return json(400, { error: "missing_booking_id" });
  }
  const bookingId = String(rawId).trim();
  if (!bookingId) {
    return json(400, { error: "invalid_booking_id" });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
        apikey: apikey.trim(),
      },
    },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;
  const email = (user?.email || "").trim();
  if (userErr || !user?.id || !email) {
    return json(401, { error: "invalid_session", message: "Войдите снова и откройте страницу возврата с оплаты." });
  }

  const { data: booking, error: bookErr } = await supabase
    .from("bookings")
    .select("id, user_id, guest_id, property_id, check_in, check_out, guests, children, total_amount, pay_type, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookErr) {
    return json(403, { error: "booking_fetch_failed", detail: String(bookErr.message || bookErr) });
  }
  if (!booking) {
    return json(404, { error: "booking_not_found" });
  }
  const uid = user.id;
  if (booking.user_id !== uid && booking.guest_id !== uid) {
    return json(403, { error: "forbidden" });
  }

  let propertyTitle = "Объект размещения";
  const pid = booking.property_id;
  if (pid) {
    const { data: prop } = await supabase.from("properties").select("title").eq("id", pid).maybeSingle();
    if (prop && typeof prop.title === "string" && prop.title.trim()) {
      propertyTitle = prop.title.trim();
    }
  }

  const siteUrl = (Deno.env.get("SILVA_SITE_URL") || "https://silva01.vercel.app").replace(/\/$/, "");
  const fromDefault = "Silva <onboarding@resend.dev>";
  const from = (Deno.env.get("SILVA_BOOKING_FROM_EMAIL") || "").trim() || fromDefault;

  const payLabel = booking.pay_type === "30" ? "предоплата 30%" : "полная оплата";
  const amountNum = Number(booking.total_amount);
  const amountStr = Number.isFinite(amountNum) ? `${Math.round(amountNum).toLocaleString("ru-RU")} ₽` : "—";

  const subjectPlain = `Бронирование в Silva — ${propertyTitle}`.slice(0, 998);
  const safeTitle = escapeHtml(propertyTitle);
  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#111827;background:#f9fafb;padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;padding:28px 24px;">
    <tr><td>
      <p style="margin:0 0 8px;font-size:15px;color:#374151;">Здравствуйте!</p>
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#111827;">Вы забронировали объект в Silva</h1>
      <p style="margin:0 0 20px;font-size:15px;color:#4b5563;">Спасибо за оплату. Ниже краткие детали бронирования. Полный список броней — в личном кабинете.</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;color:#374151;margin-bottom:24px;">
        <tr><td style="padding:6px 0;color:#6b7280;">Объект</td><td style="padding:6px 0;text-align:right;font-weight:500;color:#111827;">${safeTitle}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Заезд</td><td style="padding:6px 0;text-align:right;">${escapeHtml(formatRuDate(String(booking.check_in || "")))}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Выезд</td><td style="padding:6px 0;text-align:right;">${escapeHtml(formatRuDate(String(booking.check_out || "")))}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Гости</td><td style="padding:6px 0;text-align:right;">${escapeHtml(String(booking.guests ?? "—"))}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Оплата</td><td style="padding:6px 0;text-align:right;">${escapeHtml(payLabel)} · ${escapeHtml(amountStr)}</td></tr>
      </table>
      <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">Номер брони: <strong style="color:#111827;">${escapeHtml(bookingId)}</strong></p>
      <a href="${escapeHtml(siteUrl)}/legacy/my-bookings.html" style="display:inline-block;background:#111827;color:#f9fafb;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:14px;font-weight:500;">Мои бронирования</a>
      <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">С уважением,<br>Silva · загородный отдых</p>
    </td></tr>
  </table>
</body></html>`;

  const resendRes = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: subjectPlain,
      html,
    }),
  });

  const resendData = await resendRes.json().catch(() => ({}));
  if (!resendRes.ok) {
    const msg =
      resendData && typeof resendData === "object" && resendData !== null && "message" in resendData
        ? String((resendData as { message?: string }).message)
        : `resend_http_${resendRes.status}`;
    return json(502, { error: "resend_error", message: msg.slice(0, 400) });
  }

  return json(200, { ok: true, id: (resendData as { id?: string }).id });
});

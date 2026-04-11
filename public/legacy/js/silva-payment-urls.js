/**
 * Прод: URL Edge Functions ЮKassa (Supabase project ref).
 * На localhost / 127.0.0.1 не задаём — работает Vite-прокси /api/yookassa/*.
 */
(function () {
  try {
    var h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") return;
  } catch (e) {}
  var base = "https://siqvswjrhmckufuaomhy.supabase.co/functions/v1";
  window.SILVA_PAYMENT_URLS = {
    create: base + "/yookassa-create-payment",
    status: base + "/yookassa-payment-status?id=",
  };
})();

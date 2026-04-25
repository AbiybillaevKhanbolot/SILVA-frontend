/**
 * Прод: URL Edge Functions ЮKassa (Supabase project ref).
 * На localhost / 127.0.0.1 не задаём — работает Vite-прокси /api/yookassa/*.
 */
(function () {
  var directBase = "https://siqvswjrhmckufuaomhy.supabase.co/functions/v1";
  try {
    var h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") return;
    var origin = window.location.origin || "";
    var proxyBase = origin ? origin.replace(/\/+$/, "") + "/api/supabase/functions/v1" : "";
    var base = proxyBase || directBase;
    window.SILVA_PAYMENT_URLS = {
      create: base + "/yookassa-create-payment",
      status: base + "/yookassa-payment-status?id=",
    };
    return;
  } catch (e) {}
  var base = directBase;
  window.SILVA_PAYMENT_URLS = {
    create: base + "/yookassa-create-payment",
    status: base + "/yookassa-payment-status?id=",
  };
})();

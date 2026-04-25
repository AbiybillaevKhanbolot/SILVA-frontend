/**
 * Прод: URL backend-функций ЮKassa (например, Firebase Functions).
 * На localhost / 127.0.0.1 не задаём — работает Vite-прокси /api/yookassa/*.
 */
(function () {
  try {
    var h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") return;
  } catch (e) {}
  var createExplicit = window.SILVA_PAYMENT_CREATE_URL || '';
  var statusExplicit = window.SILVA_PAYMENT_STATUS_URL || '';
  if (createExplicit && statusExplicit) {
    window.SILVA_PAYMENT_URLS = {
      create: String(createExplicit).replace(/\/$/, ''),
      status: String(statusExplicit)
    };
    return;
  }
  var base = window.SILVA_PAYMENT_BASE_URL || '';
  if (!base) return;
  base = String(base).replace(/\/$/, '');
  window.SILVA_PAYMENT_URLS = {
    create: base + "/yookassa-create-payment",
    status: base + "/yookassa-payment-status?id=",
  };
})();

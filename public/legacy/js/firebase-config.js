(function (window) {
  window.SILVA_FIREBASE_CONFIG = window.SILVA_FIREBASE_CONFIG || {
    apiKey: "AIzaSyDQg8FKtMd2MpcsyDq05XsvBUUbhGY-Nw8",
    authDomain: "silva-prod.firebaseapp.com",
    projectId: "silva-prod",
    storageBucket: "silva-prod.firebasestorage.app",
    messagingSenderId: "940217792598",
    appId: "1:940217792598:web:111d092058c82949eda3f7"
  };

  // Пример: https://europe-west1-<project-id>.cloudfunctions.net
  window.SILVA_PAYMENT_BASE_URL = window.SILVA_PAYMENT_BASE_URL || "";
  // Для Firebase Functions (camelCase URL): задайте ЯВНО оба endpoint:
  // window.SILVA_PAYMENT_CREATE_URL = "https://europe-west1-<project-id>.cloudfunctions.net/yookassaCreatePayment";
  // window.SILVA_PAYMENT_STATUS_URL = "https://europe-west1-<project-id>.cloudfunctions.net/yookassaPaymentStatus?id=";
  window.SILVA_PAYMENT_CREATE_URL = window.SILVA_PAYMENT_CREATE_URL || "";
  window.SILVA_PAYMENT_STATUS_URL = window.SILVA_PAYMENT_STATUS_URL || "";
  // Опционально: отдельный backend upload endpoint (по умолчанию /api/storage/upload).
  window.SILVA_UPLOAD_API_URL = window.SILVA_UPLOAD_API_URL || "";
})(window);

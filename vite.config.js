import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Явно отдаём статику из public (в т.ч. /legacy/*.html). Имя contact.html вместо contacts.html —
// чтобы запрос не пересекался с клиентским маршрутом /contacts и fallback на index.html.
export default defineConfig({
  plugins: [react()],
  publicDir: "public",
});

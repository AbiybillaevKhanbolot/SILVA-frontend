import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { yookassaDevApiPlugin } from "./vite-plugin-yookassa-dev-api.js";

// Явно отдаём статику из public (в т.ч. /legacy/*.html). Имя contact.html вместо contacts.html —
// чтобы запрос не пересекался с клиентским маршрутом /contacts и fallback на index.html.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), yookassaDevApiPlugin(env)],
    publicDir: "public",
  };
});

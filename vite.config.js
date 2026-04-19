import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { openrouterDevApiPlugin } from "./vite-plugin-openrouter-dev-api.js";
import { yookassaDevApiPlugin } from "./vite-plugin-yookassa-dev-api.js";

// Явно отдаём статику из public (в т.ч. /legacy/*.html). Имя contact.html вместо contacts.html —
// чтобы запрос не пересекался с клиентским маршрутом /contacts и fallback на index.html.
export default defineConfig(({ mode }) => {
  // Пустой префикс в новых Vite не подхватывает OPENROUTER_* / YOOKASSA_* — задаём явно.
  const env = {
    ...process.env,
    ...loadEnv(mode, process.cwd(), ["VITE_", "OPENROUTER_", "YOOKASSA_"]),
  };
  return {
    plugins: [react(), yookassaDevApiPlugin(env), openrouterDevApiPlugin()],
    publicDir: "public",
  };
});

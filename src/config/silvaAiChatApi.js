/**
 * URL прокси чата (без API-ключа во фронте).
 * — dev: относительный /api/ai/chat (Vite middleware + OPENROUTER_API_KEY в .env)
 * — prod: полный URL Edge Function после `supabase functions deploy silva-openrouter-chat`
 */
export function getSilvaAiChatEndpoint() {
  const explicit = import.meta.env.VITE_SILVA_AI_CHAT_URL;
  if (explicit && String(explicit).trim()) {
    return String(explicit).trim().replace(/\/$/, "");
  }
  if (import.meta.env.DEV) {
    return "/api/ai/chat";
  }
  return null;
}

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getSilvaAiChatEndpoint } from "../config/silvaAiChatApi";
import "../styles/silva-ai-chat-modal.css";

const WELCOME_TEXT =
  "Привет! Я помощник Silva по поиску и бронированию загородного жилья. Спросите что угодно — отвечает модель через OpenRouter.";
const SILVA_SITE_ORIGIN = "https://silva01.vercel.app";
const SILVA_CHAT_SYSTEM_PROMPT = `
Ты — ИИ-помощник только сайта Silva (${SILVA_SITE_ORIGIN}).
Твоя задача: помогать пользователю пользоваться именно Silva (поиск жилья, каталог, карточка объекта, бронирование, личный кабинет, избранное, отзывы, лояльность, контакты).

Правила:
1) Отвечай только в контексте сайта Silva. Не представляйся ассистентом OpenAI или иной платформы.
2) На вопросы вне Silva мягко возвращай к помощи по сайту и предлагай ближайшее действие на сайте.
3) Давай практические шаги интерфейса ("нажмите", "перейдите", "выберите").
4) Когда упоминаешь страницу/раздел, всегда добавляй ссылку в формате Markdown [Текст](URL).
5) Используй только реальные страницы Silva:
   - Каталог: /legacy/catalog.html
   - Главная: /legacy/index.html
   - Вход: /legacy/login.html
   - Регистрация: /legacy/register.html
   - Профиль: /legacy/profile.html
   - Мои бронирования: /legacy/my-bookings.html
   - Программа лояльности: /legacy/loyalty.html
   - Контакты: /legacy/contact.html
   - Карточка объекта: /legacy/property.html?id=<ID>
6) Не выдумывай несуществующие страницы, функции, цены и данные объектов.
7) Если данных недостаточно — честно скажи и предложи, куда на сайте перейти дальше.
8) Отвечай на русском, коротко и по делу.
`.trim();

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildApiMessages(list) {
  return list
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        m.id !== "welcome",
    )
    .map((m) => ({ role: m.role, content: String(m.text || "").slice(0, 12_000) }));
}

function isOpenRouterEndpoint(endpoint) {
  return /(^https?:\/\/)?openrouter\.ai\/api\/v1\/chat\/completions\/?$/i.test(String(endpoint || "").trim());
}

/** Для удаленного эндпоинта можно передать опциональный bearer-токен через VITE_SILVA_AI_CHAT_BEARER. */
function buildChatRequestHeaders(endpoint) {
  const headers = { "Content-Type": "application/json" };
  const isRemote = /^https?:\/\//i.test(endpoint);
  if (!isRemote) return headers;
  const bearer = String(import.meta.env.VITE_SILVA_AI_CHAT_BEARER || "").trim();
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }
  if (isOpenRouterEndpoint(endpoint)) {
    headers["HTTP-Referer"] = window?.location?.origin || "https://silva01.vercel.app";
    headers["X-Title"] = "Silva";
  }
  return headers;
}

function buildChatRequestBody(endpoint, payloadMessages) {
  const withSystem = [
    { role: "system", content: SILVA_CHAT_SYSTEM_PROMPT },
    ...payloadMessages.filter((m) => m.role !== "system"),
  ];
  if (isOpenRouterEndpoint(endpoint)) {
    const model = String(import.meta.env.VITE_SILVA_AI_OPENROUTER_MODEL || "openai/gpt-oss-120b:free").trim();
    return {
      model: model || "openai/gpt-oss-120b:free",
      messages: withSystem,
    };
  }
  return { messages: withSystem };
}

function extractAssistantContent(endpoint, data) {
  if (isOpenRouterEndpoint(endpoint)) {
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === "string" ? content.trim() : "";
  }
  return typeof data?.content === "string" ? data.content.trim() : "";
}

function normalizeSilvaHref(rawHref) {
  const href = String(rawHref || "").trim();
  if (!href) return null;
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith("/")) return href;
  if (/^[a-z0-9-]+\.html(\?|#|$)/i.test(href)) {
    return `/legacy/${href}`;
  }
  if (/^(catalog|index|login|register|profile|my-bookings|loyalty|contact)\.html(\?|#|$)/i.test(href)) {
    return `/legacy/${href}`;
  }
  return null;
}

function renderAssistantTextWithLinks(text) {
  const source = String(text || "");
  const parts = [];
  const markdownOrUrl = /\[([^\]\n]{1,80})\]\(([^)\s]{1,300})\)|(https?:\/\/[^\s)]+|\/legacy\/[^\s)]+|[a-z0-9-]+\.html(?:\?[^\s)]*)?)/gi;
  let lastIndex = 0;
  let matchIndex = 0;
  let m;
  while ((m = markdownOrUrl.exec(source)) !== null) {
    const start = m.index;
    const end = m.index + m[0].length;
    if (start > lastIndex) {
      parts.push(source.slice(lastIndex, start));
    }
    const markdownLabel = m[1];
    const markdownHref = m[2];
    const plainUrl = m[3];
    const href = normalizeSilvaHref(markdownHref || plainUrl);
    if (href) {
      const label = markdownLabel || plainUrl;
      const isExternal = /^https?:\/\//i.test(href);
      parts.push(
        <a
          key={`link-${start}-${matchIndex}`}
          href={href}
          className="silva-ai-chat-link"
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
        >
          {label}
        </a>,
      );
      matchIndex += 1;
    } else {
      parts.push(m[0]);
    }
    lastIndex = end;
  }
  if (lastIndex < source.length) {
    parts.push(source.slice(lastIndex));
  }
  return parts;
}

export default function SilvaAiChatModal({ open, onClose }) {
  const titleId = useId();
  const closeRef = useRef(null);
  const listEndRef = useRef(null);
  const messagesRef = useRef([]);
  const [messages, setMessages] = useState(() => [
    { id: "welcome", role: "assistant", text: WELCOME_TEXT },
  ]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const t = requestAnimationFrame(() => {
      closeRef.current?.focus();
    });
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open, pending]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || pending) return;

    const userMsg = { id: nextId(), role: "user", text };
    const afterUser = [...messagesRef.current, userMsg];
    messagesRef.current = afterUser;
    setMessages(afterUser);
    setDraft("");
    setPending(true);

    const endpoint = getSilvaAiChatEndpoint();
    const payloadMessages = buildApiMessages(afterUser);

    if (!endpoint) {
      const errLine = {
        id: nextId(),
        role: "assistant",
        text: "Чат недоступен: для продакшена укажите в .env переменную VITE_SILVA_AI_CHAT_URL (полный URL вашего backend endpoint).",
      };
      const next = [...afterUser, errLine];
      messagesRef.current = next;
      setMessages(next);
      setPending(false);
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: buildChatRequestHeaders(endpoint),
        body: JSON.stringify(buildChatRequestBody(endpoint, payloadMessages)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (typeof data?.error?.message === "string" && data.error.message) ||
          (typeof data.message === "string" && data.message) ||
          (typeof data.error === "string" && data.error) ||
          `Запрос не удался (${res.status})`;
        throw new Error(msg);
      }
      const content = extractAssistantContent(endpoint, data);
      if (!content) {
        throw new Error("Пустой ответ модели");
      }
      const assistantMsg = { id: nextId(), role: "assistant", text: content };
      const next = [...messagesRef.current, assistantMsg];
      messagesRef.current = next;
      setMessages(next);
    } catch (e) {
      const assistantMsg = {
        id: nextId(),
        role: "assistant",
        text: `Не удалось получить ответ: ${e instanceof Error ? e.message : "ошибка сети"}`,
      };
      const next = [...messagesRef.current, assistantMsg];
      messagesRef.current = next;
      setMessages(next);
    } finally {
      setPending(false);
    }
  }, [draft, pending]);

  const onSubmit = (e) => {
    e.preventDefault();
    void send();
  };

  if (!open) return null;

  const node = (
    <div className="silva-ai-chat-overlay" role="presentation" onClick={onClose}>
      <div
        className="silva-ai-chat-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="silva-ai-chat-header">
          <div>
            <h2 id={titleId} className="silva-ai-chat-title">
              Помощник Silva
            </h2>
            <p className="silva-ai-chat-sub">Чат с ИИ</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="silva-ai-chat-close"
            aria-label="Закрыть чат"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="silva-ai-chat-messages" role="log" aria-live="polite" aria-relevant="additions">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`silva-ai-chat-msg silva-ai-chat-msg--${msg.role === "user" ? "user" : "assistant"}`}
            >
              {msg.role === "assistant" ? renderAssistantTextWithLinks(msg.text) : msg.text}
            </div>
          ))}
          {pending ? (
            <div
              className="silva-ai-chat-msg silva-ai-chat-msg--assistant silva-ai-chat-msg--typing"
              role="status"
              aria-live="polite"
              aria-label="Помощник печатает"
            >
              <span className="silva-ai-chat-typing-text">Помощник печатает</span>
              <span className="silva-ai-chat-typing-dots" aria-hidden="true">
                <span className="silva-ai-chat-typing-dot" />
                <span className="silva-ai-chat-typing-dot" />
                <span className="silva-ai-chat-typing-dot" />
              </span>
            </div>
          ) : null}
          <div ref={listEndRef} />
        </div>
        <form className="silva-ai-chat-form" onSubmit={onSubmit}>
          <input
            type="text"
            className="silva-ai-chat-input"
            placeholder="Напишите сообщение…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={pending}
            aria-label="Сообщение для ИИ"
          />
          <button type="submit" className="silva-ai-chat-send" disabled={pending || !draft.trim()}>
            Отправить
          </button>
        </form>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

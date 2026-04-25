import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getSilvaAiChatEndpoint } from "../config/silvaAiChatApi";
import "../styles/silva-ai-chat-modal.css";

const WELCOME_TEXT =
  "Привет! Я помощник Silva по поиску и бронированию загородного жилья. Спросите что угодно — отвечает модель через OpenRouter.";

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

/** Для удаленного эндпоинта можно передать опциональный bearer-токен через VITE_SILVA_AI_CHAT_BEARER. */
function buildChatRequestHeaders(endpoint) {
  const headers = { "Content-Type": "application/json" };
  const isRemote = /^https?:\/\//i.test(endpoint);
  if (!isRemote) return headers;
  const bearer = String(import.meta.env.VITE_SILVA_AI_CHAT_BEARER || "").trim();
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }
  return headers;
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
        body: JSON.stringify({ messages: payloadMessages }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (typeof data.message === "string" && data.message) ||
          (typeof data.error === "string" && data.error) ||
          `Запрос не удался (${res.status})`;
        throw new Error(msg);
      }
      if (typeof data.content !== "string" || !data.content.trim()) {
        throw new Error("Пустой ответ модели");
      }
      const assistantMsg = { id: nextId(), role: "assistant", text: data.content.trim() };
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
              {msg.text}
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

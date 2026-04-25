/**
 * Только для `npm run dev`: POST /api/ai/chat — ключ OpenRouter в OPENROUTER_API_KEY (.env), не во фронте.
 * Ключ читается из .env на диске (рядом с vite.config) + loadEnv + process.env — так надёжнее, чем один loadEnv.
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function readBodyJson(req, maxLen = 200_000) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > maxLen) {
        req.destroy();
        reject(new Error("body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function stripQuotes(val) {
  const v = String(val).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function parseOneEnvFile(absPath) {
  const out = {};
  if (!fs.existsSync(absPath)) return out;
  const raw = fs.readFileSync(absPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    if (!key) continue;
    out[key] = stripQuotes(t.slice(eq + 1));
  }
  return out;
}

/** Как у Vite: .env → .env.local → .env.[mode] → .env.[mode].local (последние перекрывают). */
function readDotEnvLayered(envDir, mode) {
  const files = [
    path.join(envDir, ".env"),
    path.join(envDir, ".env.local"),
    path.join(envDir, `.env.${mode}`),
    path.join(envDir, `.env.${mode}.local`),
  ];
  const merged = {};
  for (const f of files) {
    Object.assign(merged, parseOneEnvFile(f));
  }
  return merged;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b:free";

const SILVA_SYSTEM_FALLBACK =
  "Ты помощник сайта Silva (https://silva01.vercel.app/). Не выдумывай объекты и ссылки; только официальный домен и путь /property?id=.";

const SILVA_PROMPT_PATH = path.join(
  process.cwd(),
  "supabase/functions/silva-openrouter-chat/silva-ai-system-prompt.txt",
);

function getSilvaSystemPrompt() {
  try {
    const t = fs.readFileSync(SILVA_PROMPT_PATH, "utf8").trim();
    return t || SILVA_SYSTEM_FALLBACK;
  } catch {
    return SILVA_SYSTEM_FALLBACK;
  }
}

function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const m of raw.slice(-40)) {
    if (!m || typeof m !== "object") continue;
    const role = m.role === "user" || m.role === "assistant" || m.role === "system" ? m.role : null;
    const content = typeof m.content === "string" ? m.content.trim() : "";
    if (!role || !content) continue;
    out.push({ role, content: content.slice(0, 12_000) });
  }
  return out;
}

function sanitizeFileName(name) {
  const base = String(name || "image.jpg")
    .replace(/[^\w.\-]+/g, "_")
    .slice(-120);
  return base || "image.jpg";
}

function inferExt(contentType, fileName) {
  const low = String(contentType || "").toLowerCase();
  if (low.includes("png")) return "png";
  if (low.includes("webp")) return "webp";
  if (low.includes("gif")) return "gif";
  if (low.includes("jpeg") || low.includes("jpg")) return "jpg";
  const m = /\.([a-z0-9]{1,6})$/i.exec(String(fileName || ""));
  return m ? String(m[1]).toLowerCase() : "jpg";
}

export function openrouterDevApiPlugin() {
  return {
    name: "openrouter-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url || "";
        const mode = server.config.mode;
        const envDir = server.config.envDir;
        const fromDisk = readDotEnvLayered(envDir, mode);
        const fromVite = loadEnv(mode, envDir, ["OPENROUTER_", "VITE_", "YOOKASSA_"]);
        const env = { ...fromDisk, ...fromVite, ...process.env };
        const apiKey = env.OPENROUTER_API_KEY;
        const model = (env.OPENROUTER_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
        const storageEndpoint = String(env.YC_STORAGE_ENDPOINT || "https://storage.yandexcloud.net").trim();
        const storageRegion = String(env.YC_STORAGE_REGION || "ru-central1").trim();
        const storageBucket = String(env.YC_STORAGE_BUCKET || "").trim();
        const storageAccessKeyId = String(env.YC_STORAGE_ACCESS_KEY_ID || "").trim();
        const storageSecretAccessKey = String(env.YC_STORAGE_SECRET_ACCESS_KEY || "").trim();

        if (rawUrl.startsWith("/api/ai/chat") && req.method === "POST") {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          if (!apiKey || !String(apiKey).trim()) {
            res.statusCode = 503;
            res.end(
              JSON.stringify({
                error: "openrouter_env_missing",
                message:
                  "В корне проекта (рядом с vite.config.js) создайте файл .env со строкой OPENROUTER_API_KEY=... и перезапустите npm run dev.",
              }),
            );
            return;
          }
          try {
            const body = await readBodyJson(req);
            let messages = sanitizeMessages(body.messages);
            if (messages.length === 0) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "no_messages" }));
              return;
            }
            if (messages[0].role !== "system") {
              messages = [{ role: "system", content: getSilvaSystemPrompt() }, ...messages];
            }

            const orRes = await fetch(OPENROUTER_URL, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${String(apiKey).trim()}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5173",
                "X-Title": "Silva dev",
              },
              body: JSON.stringify({ model, messages }),
            });
            const data = await orRes.json().catch(() => ({}));
            if (!orRes.ok) {
              const msg =
                (data && data.error && data.error.message) ||
                (data && data.message) ||
                `openrouter_http_${orRes.status}`;
              res.statusCode = 502;
              res.end(JSON.stringify({ error: "openrouter_error", message: String(msg).slice(0, 500) }));
              return;
            }
            const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
            if (typeof content !== "string") {
              res.statusCode = 502;
              res.end(JSON.stringify({ error: "openrouter_bad_response" }));
              return;
            }
            res.statusCode = 200;
            res.end(JSON.stringify({ content }));
          } catch (e) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                error: "server_error",
                message: e && e.message ? String(e.message) : "error",
              }),
            );
          }
          return;
        }

        if (rawUrl.startsWith("/api/storage/upload") && req.method === "POST") {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          if (!storageBucket || !storageAccessKeyId || !storageSecretAccessKey) {
            res.statusCode = 503;
            res.end(
              JSON.stringify({
                error: "storage_env_missing",
                message:
                  "Задайте в .env: YC_STORAGE_BUCKET, YC_STORAGE_ACCESS_KEY_ID, YC_STORAGE_SECRET_ACCESS_KEY.",
              }),
            );
            return;
          }
          try {
            const body = await readBodyJson(req, 12_000_000);
            const fileName = sanitizeFileName(body.fileName);
            const contentType = String(body.contentType || "image/jpeg").slice(0, 80);
            const base64 = String(body.base64 || "");
            const ownerId = String(body.ownerId || "anon").replace(/[^\w\-]+/g, "_").slice(0, 64);
            if (!base64) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "missing_file_data" }));
              return;
            }
            const bytes = Buffer.from(base64, "base64");
            if (!bytes.length || bytes.length > 10 * 1024 * 1024) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "invalid_or_too_large_file" }));
              return;
            }

            const ext = inferExt(contentType, fileName);
            const objectKey = `${ownerId}/property-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const client = new S3Client({
              region: storageRegion,
              endpoint: storageEndpoint,
              forcePathStyle: true,
              credentials: {
                accessKeyId: storageAccessKeyId,
                secretAccessKey: storageSecretAccessKey,
              },
            });
            await client.send(
              new PutObjectCommand({
                Bucket: storageBucket,
                Key: objectKey,
                Body: bytes,
                ContentType: contentType,
                ACL: "public-read",
              }),
            );
            const publicUrl = `${storageEndpoint.replace(/\/$/, "")}/${encodeURIComponent(storageBucket)}/${objectKey
              .split("/")
              .map((x) => encodeURIComponent(x))
              .join("/")}`;
            res.statusCode = 200;
            res.end(JSON.stringify({ url: publicUrl, key: objectKey }));
          } catch (e) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                error: "storage_upload_failed",
                message: e && e.message ? String(e.message) : "upload_error",
              }),
            );
          }
          return;
        }

        next();
      });
    },
  };
}

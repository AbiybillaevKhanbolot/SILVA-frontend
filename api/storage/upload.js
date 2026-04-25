import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
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

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try {
    return req.body ? JSON.parse(String(req.body)) : {};
  } catch (e) {
    return {};
  }
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const storageEndpoint = String(process.env.YC_STORAGE_ENDPOINT || "https://storage.yandexcloud.net").trim();
  const storageRegion = String(process.env.YC_STORAGE_REGION || "ru-central1").trim();
  const storageBucket = String(process.env.YC_STORAGE_BUCKET || "").trim();
  const storageAccessKeyId = String(process.env.YC_STORAGE_ACCESS_KEY_ID || "").trim();
  const storageSecretAccessKey = String(process.env.YC_STORAGE_SECRET_ACCESS_KEY || "").trim();
  if (!storageBucket || !storageAccessKeyId || !storageSecretAccessKey) {
    res.status(503).json({
      error: "storage_env_missing",
      message: "Set YC_STORAGE_BUCKET, YC_STORAGE_ACCESS_KEY_ID, YC_STORAGE_SECRET_ACCESS_KEY in Vercel env.",
    });
    return;
  }

  try {
    const body = readBody(req);
    const fileName = sanitizeFileName(body.fileName);
    const contentType = String(body.contentType || "image/jpeg").slice(0, 80);
    const base64 = String(body.base64 || "");
    const ownerId = String(body.ownerId || "anon").replace(/[^\w\-]+/g, "_").slice(0, 64);
    const kindRaw = String(body.kind || "property").toLowerCase();
    const kind = kindRaw === "avatar" ? "avatar" : "property";
    if (!base64) {
      res.status(400).json({ error: "missing_file_data" });
      return;
    }
    const bytes = Buffer.from(base64, "base64");
    if (!bytes.length || bytes.length > 10 * 1024 * 1024) {
      res.status(400).json({ error: "invalid_or_too_large_file" });
      return;
    }

    const ext = inferExt(contentType, fileName);
    const prefix = kind === "avatar" ? "avatars" : "property";
    const objectKey = `${ownerId}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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
    res.status(200).json({ url: publicUrl, key: objectKey });
  } catch (e) {
    res.status(500).json({
      error: "storage_upload_failed",
      message: e && e.message ? String(e.message) : "upload_error",
    });
  }
}

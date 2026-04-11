/**
 * Только для `npm run dev`: прокси к API ЮKassa без утечки секрета во фронт.
 * `vite build` / статический хостинг — без этого плагина; нужен отдельный бэкенд или Edge Function.
 */
import { randomUUID } from "node:crypto";

const YK_API = "https://api.yookassa.ru/v3";

function readBodyJson(req) {
    return new Promise((resolve, reject) => {
        let raw = "";
        req.on("data", (c) => {
            raw += c;
            if (raw.length > 1e6) {
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

export function yookassaDevApiPlugin(env) {
    return {
        name: "yookassa-dev-api",
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                const rawUrl = req.url || "";
                const shopId = env.YOOKASSA_SHOP_ID;
                const secret = env.YOOKASSA_SECRET_KEY;

                if (rawUrl.startsWith("/api/yookassa/create-payment") && req.method === "POST") {
                    res.setHeader("Content-Type", "application/json; charset=utf-8");
                    if (!shopId || !secret) {
                        res.statusCode = 503;
                        res.end(
                            JSON.stringify({
                                error: "yookassa_env_missing",
                                message:
                                    "Задайте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY в .env (см. .env.example).",
                            })
                        );
                        return;
                    }
                    try {
                        const body = await readBodyJson(req);
                        const amountRub = Number(body.amountRub);
                        if (!(amountRub > 0) || amountRub > 10_000_000 || !Number.isFinite(amountRub)) {
                            res.statusCode = 400;
                            res.end(JSON.stringify({ error: "invalid_amount" }));
                            return;
                        }
                        const value = amountRub.toFixed(2);
                        const host = req.headers.host || "localhost:5173";
                        const xfProto = (req.headers["x-forwarded-proto"] || "")
                            .split(",")[0]
                            .trim();
                        const proto = xfProto || "http";
                        const returnUrl = `${proto}://${host}/legacy/booking-return.html`;

                        const metaIn = body.metadata && typeof body.metadata === "object" ? body.metadata : {};
                        const metadata = {};
                        Object.keys(metaIn).forEach(function (k) {
                            metadata[String(k).slice(0, 64)] = String(metaIn[k] ?? "").slice(0, 256);
                        });

                        const idempotenceKey = randomUUID();
                        const auth = Buffer.from(`${shopId}:${secret}`, "utf8").toString("base64");
                        const description = String(body.description || "Бронирование Silva").slice(0, 128);

                        const ykRes = await fetch(`${YK_API}/payments`, {
                            method: "POST",
                            headers: {
                                Authorization: `Basic ${auth}`,
                                "Idempotence-Key": idempotenceKey,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                amount: { value, currency: "RUB" },
                                confirmation: { type: "redirect", return_url: returnUrl },
                                capture: true,
                                description,
                                metadata,
                            }),
                        });
                        const data = await ykRes.json();
                        if (!ykRes.ok) {
                            res.statusCode = 502;
                            res.end(JSON.stringify({ error: "yookassa_error", detail: data }));
                            return;
                        }
                        const confirmationUrl = data.confirmation && data.confirmation.confirmation_url;
                        if (!confirmationUrl) {
                            res.statusCode = 502;
                            res.end(JSON.stringify({ error: "no_confirmation_url", detail: data }));
                            return;
                        }
                        res.statusCode = 200;
                        res.end(
                            JSON.stringify({
                                paymentId: data.id,
                                confirmationUrl,
                                test: data.test === true,
                            })
                        );
                    } catch (e) {
                        res.statusCode = 500;
                        res.end(
                            JSON.stringify({
                                error: "server_error",
                                message: e && e.message ? String(e.message) : "error",
                            })
                        );
                    }
                    return;
                }

                if (rawUrl.startsWith("/api/yookassa/payment") && req.method === "GET") {
                    res.setHeader("Content-Type", "application/json; charset=utf-8");
                    if (!shopId || !secret) {
                        res.statusCode = 503;
                        res.end(JSON.stringify({ error: "yookassa_env_missing" }));
                        return;
                    }
                    let id;
                    try {
                        const u = new URL(rawUrl, "http://localhost");
                        id = u.searchParams.get("id");
                    } catch (e) {
                        id = null;
                    }
                    if (!id) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ error: "missing_id" }));
                        return;
                    }
                    try {
                        const auth = Buffer.from(`${shopId}:${secret}`, "utf8").toString("base64");
                        const ykRes = await fetch(`${YK_API}/payments/${encodeURIComponent(id)}`, {
                            headers: { Authorization: `Basic ${auth}` },
                        });
                        const data = await ykRes.json();
                        if (!ykRes.ok) {
                            res.statusCode = 502;
                            res.end(JSON.stringify({ error: "yookassa_error", detail: data }));
                            return;
                        }
                        res.statusCode = 200;
                        res.end(
                            JSON.stringify({
                                id: data.id,
                                status: data.status,
                                paid: data.paid === true,
                                amount: data.amount,
                                metadata: data.metadata,
                                test: data.test === true,
                            })
                        );
                    } catch (e) {
                        res.statusCode = 500;
                        res.end(
                            JSON.stringify({
                                error: "server_error",
                                message: e && e.message ? String(e.message) : "error",
                            })
                        );
                    }
                    return;
                }

                next();
            });
        },
    };
}

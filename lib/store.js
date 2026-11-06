import { Redis } from "@upstash/redis";
import crypto from "node:crypto";

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
export const redis = url && token ? new Redis({ url, token })
  : process.env.DQ_DEV_MEMORY ? memoryStore() : null;

// Solo para pruebas locales (DQ_DEV_MEMORY=1): imita lo mínimo de Redis en memoria.
function memoryStore() {
  const m = new Map(), now = () => Date.now();
  const alive = k => { const e = m.get(k); if (e && e.exp && e.exp < now()) { m.delete(k); return null; } return e || null; };
  const api = {
    async set(k, v, o = {}) { m.set(k, { v: structuredClone(v), exp: o.ex ? now() + o.ex * 1000 : 0 }); return "OK"; },
    async get(k) { const e = alive(k); return e ? structuredClone(e.v) : null; },
    async getdel(k) { const e = alive(k); m.delete(k); return e ? e.v : null; },
    async exists(k) { return alive(k) ? 1 : 0; },
    async mget(...ks) { return ks.map(k => { const e = alive(k); return e ? e.v : null; }); },
    async del(k) { m.delete(k); return 1; },
    pipeline() { const q = []; const p = { set: (...a) => (q.push(() => api.set(...a)), p), del: (...a) => (q.push(() => api.del(...a)), p), exec: () => Promise.all(q.map(f => f())) }; return p; },
  };
  return api;
}

export const rand = (n = 16) => crypto.randomBytes(n).toString("base64url");
export const sha = s => crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 32);

export function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  return (Array.isArray(xf) ? xf[0] : (xf || "")).split(",")[0].trim() || req.socket?.remoteAddress || "";
}

export function readCookie(req, name) {
  const m = (req.headers.cookie || "").match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export async function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch { return {}; }
}

export function needStore(res) {
  if (redis) return false;
  res.status(503).json({ error: "store", message: "Falta conectar la base de datos (Upstash Redis) en Vercel." });
  return true;
}

export function staffOk(k) {
  const key = process.env.QR_KEY;
  return !!key && typeof k === "string" && k.length === key.length &&
    crypto.timingSafeEqual(Buffer.from(k), Buffer.from(key));
}

/* Premios: probabilidad inversa al monto. El orden coincide con la ruleta del front. */
export const PREMIOS = [
  { v: 50, p: 30 }, { v: 200, p: 15 }, { v: 0, p: 12, again: true }, { v: 500, p: 4 },
  { v: 100, p: 22 }, { v: 400, p: 6 }, { v: 1000, p: 1 }, { v: 300, p: 10 },
];
export function pickPrize(allowAgain = true) {
  const pool = PREMIOS.map((p, i) => ({ ...p, i })).filter(p => allowAgain || !p.again);
  const total = pool.reduce((a, p) => a + p.p, 0);
  let x = crypto.randomInt(0, total * 1000) / 1000;
  for (const p of pool) { if ((x -= p.p) < 0) return p.i; }
  return pool[0].i;
}

export const PLAYED_TTL = 60 * 60 * 24 * 90; // 90 días

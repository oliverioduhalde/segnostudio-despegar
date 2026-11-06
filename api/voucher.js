import { redis, staffOk, needStore } from "../lib/store.js";

// Para Despegar: verificar un código. GET /api/voucher?k=CLAVE&code=NAV100-XXXXXX
export default async function handler(req, res) {
  if (!staffOk(req.query.k)) return res.status(401).json({ error: "key" });
  if (needStore(res)) return;
  const v = await redis.get(`voucher:${String(req.query.code || "").toUpperCase()}`);
  res.json(v ? { valid: true, voucher: v } : { valid: false });
}

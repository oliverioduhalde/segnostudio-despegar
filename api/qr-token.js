import { redis, rand, staffOk, needStore } from "../lib/store.js";

// Pantalla del stand: pide un pase nuevo de un solo uso. Requiere la clave del staff (?k=).
export default async function handler(req, res) {
  if (!staffOk(req.query.k)) return res.status(401).json({ error: "key" });
  if (needStore(res)) return;
  const t = rand(12);
  await redis.set(`tok:${t}`, 1, { ex: 45 });
  res.json({ token: t, rotate: 20 });
}

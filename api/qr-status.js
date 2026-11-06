import { redis, staffOk, needStore } from "../lib/store.js";

// La pantalla consulta si su pase ya fue usado para cambiarlo al instante.
export default async function handler(req, res) {
  if (!staffOk(req.query.k)) return res.status(401).json({ error: "key" });
  if (needStore(res)) return;
  const alive = await redis.exists(`tok:${req.query.t}`);
  res.json({ used: !alive });
}

import { redis, rand, body, needStore, pickPrize, PREMIOS, PLAYED_TTL } from "../lib/store.js";

const DESTINOS = { bariloche: "Bariloche", rio: "Río de Janeiro", nyc: "Nueva York", madrid: "Madrid", cancun: "Cancún", paris: "París" };
const MAX_AGAIN = 3;

// El premio lo sortea el servidor; el front solo anima la ruleta hasta el índice que recibe.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (needStore(res)) return;
  const { sid, dest } = await body(req);
  const s = sid && await redis.get(`sess:${sid}`);
  if (!s) return res.json({ error: "session" });

  const index = pickPrize(s.spins < MAX_AGAIN);
  const p = PREMIOS[index];
  if (p.again) {
    s.spins++;
    await redis.set(`sess:${sid}`, s, { ex: 900 });
    return res.json({ index, again: true });
  }

  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = `NAV${p.v}-`; for (let k = 0; k < 6; k++) code += abc[Math.floor(Math.random() * abc.length)];
  const voucher = { amount: p.v, dest: DESTINOS[dest] || "tu destino", destId: dest, code, date: new Date().toISOString() };

  const pipe = redis.pipeline();
  pipe.set(`voucher:${code}`, voucher);
  pipe.set(`played:c:${s.cid}`, code, { ex: PLAYED_TTL });
  if (s.lid) pipe.set(`played:l:${s.lid}`, code, { ex: PLAYED_TTL });
  if (s.fpip) pipe.set(`played:f:${s.fpip}`, code, { ex: PLAYED_TTL });
  pipe.del(`sess:${sid}`);
  await pipe.exec();
  res.json({ index, voucher });
}

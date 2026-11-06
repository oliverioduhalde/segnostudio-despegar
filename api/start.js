import { redis, rand, sha, clientIp, readCookie, body, needStore, PLAYED_TTL } from "../lib/store.js";

// El jugador llega con ?t=PASE. Se valida el pase (un solo uso) y que el celular no haya jugado.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (needStore(res)) return;
  const { t, fp, lid } = await body(req);
  const ip = clientIp(req);
  let cid = readCookie(req, "dq_cid");
  if (!cid) cid = rand(16);
  res.setHeader("Set-Cookie", `dq_cid=${cid}; Path=/; Max-Age=${PLAYED_TTL}; HttpOnly; Secure; SameSite=Lax`);

  const keys = [`played:c:${cid}`];
  if (lid) keys.push(`played:l:${sha(lid)}`);
  if (fp) keys.push(`played:f:${sha(fp + "|" + ip)}`);
  const prev = (await redis.mget(...keys)).find(Boolean);
  if (prev) {
    const v = await redis.get(`voucher:${prev}`);
    return res.json({ blocked: true, voucher: v || null });
  }

  if (!t || typeof t !== "string") return res.json({ error: "qr" });
  const ok = await redis.getdel(`tok:${t}`);
  if (!ok) return res.json({ error: "qr" });

  const sid = rand(16);
  await redis.set(`sess:${sid}`, { cid, lid: lid ? sha(lid) : null, fpip: fp ? sha(fp + "|" + ip) : null, spins: 0 }, { ex: 900 });
  res.json({ sid });
}

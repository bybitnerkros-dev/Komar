let cache = {};
let cacheTime = {};

export default async function handler(req, res) {
  try {
    const target = "https://fapi.binance.com" + req.url.replace("/api/binance", "");
    const key = target;
    const now = Date.now();

    // Cache ~1.2 sec to avoid Binance rate limits
    if (cache[key] && now - cacheTime[key] < 1200) {
      res.setHeader("x-proxy-cache", "HIT");
      return res.status(200).send(cache[key]);
    }

    const r = await fetch(target, { headers: { "User-Agent": "Mozilla/5.0" }});
    const body = await r.text();
    const ct = r.headers.get("content-type");

    if (ct) res.setHeader("content-type", ct);
    res.status(r.status).send(body);

    cache[key] = body;
    cacheTime[key] = now;

  } catch (err) {
    return res.status(500).json({ error: "Proxy error", details: err.message });
  }
}

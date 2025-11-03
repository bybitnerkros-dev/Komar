export default async function handler(req, res) {
  try {
    // Build target URL by removing the proxy prefix
    const target = "https://fapi.binance.com" + req.url.replace("/api/binance", "");
    const r = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const body = await r.text();
    // Mirror status and content-type if provided
    const ct = r.headers.get("content-type");
    if (ct) res.setHeader("content-type", ct);
    res.status(r.status).send(body);
  } catch (err) {
    res.status(500).json({ error: "Proxy error", details: err.message });
  }
}

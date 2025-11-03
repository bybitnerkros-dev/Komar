export default async function handler(req, res) {
  try {
    const target = "https://fapi.binance.com" + req.url.replace("/api/binance", "");
    const r = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const body = await r.text();
    const contentType = r.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);

    res.status(r.status).send(body);
  } catch (err) {
    res.status(500).json({ error: "Proxy error", details: err.message });
  }
}

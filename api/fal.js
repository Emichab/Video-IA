export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const FAL_KEY = "3cfb2180-f981-492d-9dff-5714fc366082:42e79d71b4824223ff082ee8f5c132d3";

  try {
    const { endpoint, body } = req.body;
    const url = "https://fal.run/" + endpoint;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": "Key " + FAL_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await resp.text();

    if (!resp.ok) {
      return res.status(resp.status).json({ error: text });
    }

    return res.status(200).json(JSON.parse(text));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

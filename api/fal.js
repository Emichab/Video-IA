export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const FAL_API_KEY = process.env.FAL_API_KEY || "3cfb2180-f981-492d-9dff-5714fc366082:42e79d71b4824223ff082ee8f5c132d3";

  try {
    const { action, endpoint, body, requestId } = req.body;

    const FAL_BASE = "https://queue.fal.run";

    if (action === "generate") {
      // Start generation
      const resp = await fetch(FAL_BASE + "/" + endpoint, {
        method: "POST",
        headers: {
          "Authorization": "Key " + FAL_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return res.status(resp.status).json({ error: errText });
      }

      const data = await resp.json();
      return res.status(200).json(data);
    }

    if (action === "status") {
      // Check status
      const resp = await fetch(FAL_BASE + "/" + endpoint + "/requests/" + requestId + "/status", {
        headers: { "Authorization": "Key " + FAL_API_KEY },
      });
      const data = await resp.json();
      return res.status(200).json(data);
    }

    if (action === "result") {
      // Get result
      const resp = await fetch(FAL_BASE + "/" + endpoint + "/requests/" + requestId, {
        headers: { "Authorization": "Key " + FAL_API_KEY },
      });
      const data = await resp.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

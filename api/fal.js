export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const FAL_KEY = process.env.FAL_API_KEY || "3cfb2180-f981-492d-9dff-5714fc366082:42e79d71b4824223ff082ee8f5c132d3";
  const headers = { "Authorization": "Key " + FAL_KEY, "Content-Type": "application/json" };

  try {
    const { action, endpoint, body, requestId } = req.body;

    if (action === "generate") {
      const url = "https://queue.fal.run/" + endpoint;
      console.log("FAL GENERATE:", url);
      const resp = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(body),
      });
      const text = await resp.text();
      console.log("FAL GENERATE RESPONSE:", resp.status, text.substring(0, 500));
      if (!resp.ok) return res.status(resp.status).json({ error: text });
      return res.status(200).json(JSON.parse(text));
    }

    if (action === "status") {
      const url = "https://queue.fal.run/" + endpoint + "/requests/" + requestId + "/status";
      console.log("FAL STATUS:", url);
      const resp = await fetch(url, { headers: { "Authorization": "Key " + FAL_KEY } });
      const text = await resp.text();
      console.log("FAL STATUS RESPONSE:", resp.status, text.substring(0, 300));
      if (!resp.ok) return res.status(resp.status).json({ error: text });
      return res.status(200).json(JSON.parse(text));
    }

    if (action === "result") {
      const url = "https://queue.fal.run/" + endpoint + "/requests/" + requestId;
      console.log("FAL RESULT:", url);
      const resp = await fetch(url, { headers: { "Authorization": "Key " + FAL_KEY } });
      const text = await resp.text();
      console.log("FAL RESULT RESPONSE:", resp.status, text.substring(0, 500));
      if (!resp.ok) return res.status(resp.status).json({ error: text });
      return res.status(200).json(JSON.parse(text));
    }

    return res.status(400).json({ error: "Invalid action: " + action });
  } catch (err) {
    console.error("FAL PROXY ERROR:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

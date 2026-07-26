const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  const store = getStore({ name: "guestbook-entries", consistency: "strong" });

  if (event.httpMethod === "GET") {
    const { blobs } = await store.list();
    const entries = await Promise.all(
      blobs.map(async (b) => {
        try {
          return await store.get(b.key, { type: "json" });
        } catch (e) {
          return null;
        }
      })
    );
    const clean = entries.filter(Boolean).sort((a, b) => b.ts - a.ts);
    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(clean),
    };
  }

  if (event.httpMethod === "POST") {
    try {
      const data = JSON.parse(event.body || "{}");
      const name = (data.name || "").toString().trim().slice(0, 24);
      const message = (data.message || "").toString().trim().slice(0, 140);
      if (!name || !message) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "name and message required" }) };
      }
      const ts = Date.now();
      const key = `entry_${ts}_${Math.random().toString(36).slice(2, 8)}`;
      const entry = { name, message, ts };
      await store.setJSON(key, entry);
      return {
        statusCode: 200,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ok", entry }),
      };
    } catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "failed to save entry" }) };
    }
  }

  return { statusCode: 405, headers, body: "Method not allowed" };
};

// lib/clientAi.js
//
// Browser-safe helper for asking the AI features questions. Calls the
// /api/ai route, which is the only thing allowed to talk to Gemini (see
// lib/gemini.js). Never import lib/gemini.js directly from a client
// component — the API key lives server-side only.

export async function askAI(prompt, { json = false, temperature } = {}) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, json, temperature }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "AI request failed");
  }
  const data = await res.json();
  return json ? data.json : data.text;
}

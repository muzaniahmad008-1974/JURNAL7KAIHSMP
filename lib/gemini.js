// lib/gemini.js
//
// Thin wrapper around Google's official Gemini SDK (@google/genai). Keeps
// the API key server-side and gives the rest of the app one function to
// call, `askGemini`, whether it needs free-form text or strict JSON back.
//
// IMPORTANT: this file must only ever be imported from server-side code
// (API routes / route handlers) so the API key never reaches the browser.

import { GoogleGenAI } from "@google/genai";

let client = null;
function getClient() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Create a free key at https://aistudio.google.com/app/apikey and add it to your environment variables."
      );
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/**
 * Ask Gemini a single-turn question.
 *
 * @param {string} prompt - The full prompt text.
 * @param {object} [opts]
 * @param {boolean} [opts.json] - If true, asks Gemini to return strict JSON
 *   (via responseMimeType) and parses it before returning.
 * @param {number} [opts.temperature]
 * @returns {Promise<string|object>} Plain text, or a parsed object when
 *   opts.json is true.
 */
export async function askGemini(prompt, opts = {}) {
  const { json = false, temperature = 0.4 } = opts;
  const ai = getClient();

  const config = { temperature };
  if (json) config.responseMimeType = "application/json";

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
    config,
  });

  const text = response.text ?? "";

  if (json) {
    try {
      return JSON.parse(text);
    } catch (e) {
      // Gemini occasionally wraps JSON in prose or code fences even when
      // asked not to — try to salvage the first {...} or [...] block before
      // giving up.
      const match = text.match(/[{\[][\s\S]*[}\]]/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (e2) {
          /* fall through */
        }
      }
      throw new Error("Gemini did not return valid JSON: " + text.slice(0, 300));
    }
  }

  return text;
}

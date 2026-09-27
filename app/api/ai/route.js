// app/api/ai/route.js
//
// Single endpoint every role's "AI insight" / "AI coach" feature calls
// through. Keeps the Gemini API key server-side.
//
//   POST /api/ai   { prompt: string, json?: boolean }   -> { text } | { json }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { askGemini } from "@/lib/gemini";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });

  try {
    const body = await request.json();
    const prompt = body?.prompt;
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Request body must include a string 'prompt'" }, { status: 400 });
    }
    const wantsJson = !!body.json;
    const result = await askGemini(prompt, { json: wantsJson, temperature: body.temperature });
    return NextResponse.json(wantsJson ? { json: result } : { text: result });
  } catch (err) {
    console.error("[/api/ai]", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}

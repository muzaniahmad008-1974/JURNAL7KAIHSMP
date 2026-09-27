"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { askAI } from "@/lib/clientAi";

export const FONT_LINK =
  "https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Inter:wght@400;500;600;700&display=swap";

export const C = {
  ink: "#1E2422",
  sub: "#5B655F",
  paper: "#FAF6EC",
  card: "#FFFFFF",
  line: "#E7E1D3",
  blue: "#1E7FD6",
  blueDeep: "#0A3B63",
  green: "#4CAF50",
  gold: "#F7B32B",
  teal: "#17A398",
  brick: "#E4572E",
  purple: "#7B5EDB",
};

export function Card({ children, className = "", style }) {
  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
      style={{ background: C.card, border: `1px solid ${C.line}`, ...style }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ title, right }) {
  return (
    <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
      <h3 style={{ fontFamily: "'Baloo 2'", color: C.ink }} className="text-[14.5px] font-bold">
        {title}
      </h3>
      {right}
    </div>
  );
}

const TONE_COLORS = {
  blue: [C.blue, "#E4EEF7"],
  green: [C.green, "#E7F3E7"],
  gold: [C.gold, "#FBF0D6"],
  brick: [C.brick, "#F7E4DF"],
};

export function Chip({ tone = "blue", children }) {
  const [fg, bg] = TONE_COLORS[tone] || TONE_COLORS.blue;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold"
      style={{ color: fg, background: bg }}
    >
      {children}
    </span>
  );
}

export function PrimaryButton({ children, icon: Icon, onClick, type = "button", style, disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13.5px] font-bold text-white disabled:opacity-50"
      style={{ background: C.blueDeep, ...style }}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

export function GhostButton({ children, icon: Icon, onClick, style, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-50"
      style={{ background: "#F1EEE3", color: C.ink, ...style }}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

/** Fetches a Gemini insight for `prompt` (expected to ask for JSON with
 * temuan/pola/rekomendasi) and renders it, with its own loading/retry state. */
export function AIInsightBlock({ title = "Wawasan AI", prompt }) {
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    if (!prompt) return;
    let alive = true;
    setState({ loading: true, data: null, error: null });
    askAI(prompt, { json: true })
      .then((data) => { if (alive) setState({ loading: false, data, error: null }); })
      .catch((err) => { if (alive) setState({ loading: false, data: null, error: err.message }); });
    return () => { alive = false; };
  }, [prompt]);

  return (
    <Card style={{ background: "linear-gradient(135deg,#EAF2F8,#F3FAF1)", border: "none" }}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} color={C.blueDeep} />
        <span style={{ fontFamily: "'Baloo 2'", color: C.blueDeep }} className="text-[14px] font-bold">{title}</span>
      </div>
      {state.loading ? (
        <div className="text-[12.5px] flex items-center gap-1.5" style={{ color: C.sub }}>
          <Loader2 size={13} className="animate-spin" /> Menganalisis data...
        </div>
      ) : state.error ? (
        <p className="text-[12px]" style={{ color: C.brick }}>Wawasan AI belum bisa dimuat saat ini. ({state.error})</p>
      ) : (
        <div className="space-y-1.5 text-[12.5px]" style={{ color: C.ink }}>
          {state.data?.temuan && <p><strong>Temuan:</strong> {state.data.temuan}</p>}
          {state.data?.pola && <p><strong>Pola:</strong> {state.data.pola}</p>}
          {state.data?.rekomendasi && <p><strong>Rekomendasi:</strong> {state.data.rekomendasi}</p>}
        </div>
      )}
      <p className="text-[10.5px] mt-2" style={{ color: C.sub }}>Dibuat oleh AI &middot; selalu diverifikasi sebelum dijadikan dasar keputusan.</p>
    </Card>
  );
}
